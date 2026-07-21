// src/pages/customer/CoachingPage.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { userService } from '../../services/userService';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { mealPlanService } from '../../services/mealPlanService';
import { appointmentService } from '../../services/appointmentService';
import { formatSessionRange } from '../../utils/offlineHireSlots';
import { refundService } from '../../services/refundService';
import { marketplaceService } from '../../services/marketplaceService';
import { coachingPaymentService } from '../../services/coachingPaymentService';
import { chatService } from '../../services/chatService';
import { sendWebSocketMessage } from '../../services/websocketService';
import { useAuthStore } from '../../stores/authStore';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import Modal from '../../components/common/Modal';
import ConfirmModal from '../../components/common/ConfirmModal';
import MealPlanSkipModal from './components/MealPlanSkipModal';
import MealPlanWeekView from './components/MealPlanWeekView';
import MealPlanWeekPicker from './components/MealPlanWeekPicker';
import MealReplacementModal from './components/MealReplacementModal';
import LateTickReasonModal from './components/LateTickReasonModal';
import { isMealPeriodOpen, canLateTickMealPeriod, nowInVn, todayLocalIso } from './components/dietUtils';
import ImageLightbox from '../../components/common/ImageLightbox';
import { toast } from 'sonner';
import {
    Loader2, Utensils, Calendar, Sparkles, Check, User, AlertCircle, X, ShieldAlert, BookOpen,
    MessageSquare, Send, ImagePlus, UploadCloud, Clock, ShoppingCart, FileText
} from 'lucide-react';
import GroceryListModal from '../../components/pt/meal-plan/GroceryListModal';
import useWebSocket from '../../hooks/useWebSocket';

const MAX_CHAT_IMAGE_SIZE = 5 * 1024 * 1024;

function toLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentWeekStart() {
  const date = new Date();
  const daysSinceMonday = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysSinceMonday);
  return toLocalDateKey(date);
}

const APPT_STATUS_LABEL = {
  PENDING: { text: 'Chờ xác nhận', cls: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { text: 'Đã xác nhận', cls: 'bg-emerald-100 text-emerald-700' },
  EXPIRED: { text: 'Đã hết hạn', cls: 'bg-slate-100 text-slate-650' },
  CANCELLED: { text: 'Đã hủy', cls: 'bg-red-50 text-red-600' },
};

const REFUND_REASONS = [
  { value: 'PT_CANCEL', label: 'PT hủy buổi' },
  { value: 'PT_NO_RESPONSE', label: 'PT không phản hồi' },
  { value: 'SLA_BREACH', label: 'Vi phạm SLA' },
  { value: 'CUSTOMER_REQUEST', label: 'Yêu cầu khác' },
];

export default function CoachingPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (!paymentStatus) return;
    if (paymentStatus === 'success') {
      toast.success('Thanh toán thành công. Coaching đã được kích hoạt và tiền đang được Nutrican giữ an toàn.');
    } else {
      toast.error(searchParams.get('message') || 'Thanh toán chưa thành công. Bạn có thể thử lại.');
    }
    setStartingPayment(false);
    navigate('/coaching', { replace: true });
  }, [navigate, searchParams]);

  // Reset pay button if user returns via browser back/forward cache from VNPay.
  useEffect(() => {
    const resetPaymentUi = () => setStartingPayment(false);
    const onPageShow = (event) => {
      if (event.persisted) resetPaymentUi();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') resetPaymentUi();
    };
    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  
  useWebSocket();

  // Tab navigation state
  const [activeTab, setActiveTab] = useState('chat'); // chat, meal-plan, appointments, contract

  // References to active PT and mapping
  const [ptThreads, setPtThreads] = useState([]);
  const [mappingStatus, setMappingStatus] = useState(null);
  const [endRequestedBy, setEndRequestedBy] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Chat-specific states
  const [activeMappingId, setActiveMappingId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState('');
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [lightboxImage, setLightboxImage] = useState('');

  const messagesEndRef = useRef(null);
  const imageInputRef = useRef(null);

  // Meal plan states
  const [mealPlan, setMealPlan] = useState(null);
  const [mealPlanItems, setMealPlanItems] = useState([]);
  const [mealPlanWeeks, setMealPlanWeeks] = useState([]);
  const [selectedMealPlanWeek, setSelectedMealPlanWeek] = useState('');
  const [mealPlanPrefWarnings, setMealPlanPrefWarnings] = useState([]);
  const [mealPlanSuggestions, setMealPlanSuggestions] = useState([]);
  const [loadingMealPlan, setLoadingMealPlan] = useState(false);
  const [weeklySummaries, setWeeklySummaries] = useState([]);
  const [newWeeklySummary, setNewWeeklySummary] = useState(false);
  const [skipModalContext, setSkipModalContext] = useState(null);
  const [skippingMeal, setSkippingMeal] = useState(false);
  const [replacementModalItem, setReplacementModalItem] = useState(null);
  const [submittingReplacement, setSubmittingReplacement] = useState(false);
  const [groceryModalOpen, setGroceryModalOpen] = useState(false);
  const [lateTickTarget, setLateTickTarget] = useState(null);
  const [lateTickLoading, setLateTickLoading] = useState(false);
  const [cancelApptId, setCancelApptId] = useState(null);
  const [cancellingAppt, setCancellingAppt] = useState(false);

  // Appointment states
  const [appointments, setAppointments] = useState([]);
  const [loadingAppts, setLoadingAppts] = useState(false);
  const [apptForm, setApptForm] = useState({ ptId: '', startTime: '', endTime: '', note: '' });
  const [bookingAppt, setBookingAppt] = useState(false);

  // End coaching & Refund states
  const [endCoachingLoading, setEndCoachingLoading] = useState(false);
  const [endCoachingModalOpen, setEndCoachingModalOpen] = useState(false);
  const [refundForm, setRefundForm] = useState({ mappingId: '', reason: 'CUSTOMER_REQUEST', note: '' });
  const [submittingRefund, setSubmittingRefund] = useState(false);
  const [coachingHistory, setCoachingHistory] = useState([]);
  const [openHireRequest, setOpenHireRequest] = useState(null);
  const [startingPayment, setStartingPayment] = useState(false);
  const [coachingWallet, setCoachingWallet] = useState(null);

  // Parse URL tab parameter
  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  // Load basic status
  useEffect(() => {
    fetchCoachingStatus();
    const onRefundUpdate = () => {
      profileExtensionsService.getCoachingHistory().then((r) => setCoachingHistory(r.data?.data || [])).catch(() => {});
      setTimeout(() => {
        coachingPaymentService.getMyWallet()
          .then((r) => setCoachingWallet(r.data?.data || null))
          .catch(() => {});
      }, 300);
    };
    const onHireUpdate = () => fetchCoachingStatus();
    window.addEventListener('refund_update', onRefundUpdate);
    window.addEventListener('hire_request_updated', onHireUpdate);
    return () => {
      window.removeEventListener('refund_update', onRefundUpdate);
      window.removeEventListener('hire_request_updated', onHireUpdate);
    };
  }, []);

  const fetchCoachingStatus = async () => {
    setIsLoading(true);
    try {
      const threadsRes = await chatService.getThreads();
      const activeThreads = (threadsRes.data.data || []).filter((t) => t.status === 'ACTIVE' || t.status === 'END_REQUESTED');
      setPtThreads(activeThreads);
      const endReq = activeThreads.find((t) => t.status === 'END_REQUESTED');
      setMappingStatus(endReq ? 'END_REQUESTED' : activeThreads.length > 0 ? 'ACTIVE' : null);
      setEndRequestedBy(endReq ? endReq.endRequestedBy : null);

      marketplaceService.getOpenHireRequest()
        .then((response) => setOpenHireRequest(response.data?.data || null))
        .catch(() => setOpenHireRequest(null));

      coachingPaymentService.getMyWallet()
        .then((response) => setCoachingWallet(response.data?.data || null))
        .catch(() => setCoachingWallet(null));

      if (activeThreads.length > 0) {
        setApptForm((f) => ({ ...f, ptId: activeThreads[0].participantId }));
        setRefundForm((f) => ({ ...f, mappingId: activeThreads[0].mappingId }));
        
        // Fetch meal plan & appointments
        fetchMealPlan();
        fetchAppointments();
      }

      profileExtensionsService.getCoachingHistory()
        .then((r) => setCoachingHistory(r.data?.data || []))
        .catch(() => {});
    } catch (err) {
      toast.error('Lỗi khi tải thông tin coaching');
    } finally {
      setIsLoading(false);
    }
  };

  const startCoachingPayment = async () => {
    if (!openHireRequest?.id) return;
    try {
      setStartingPayment(true);
      const response = await coachingPaymentService.createVnPayPayment(openHireRequest.id);
      window.location.assign(response.data.data.paymentUrl);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể khởi tạo thanh toán VNPay');
      setStartingPayment(false);
    }
  };

  // Chat logic Integration
  const loadChatThreads = useCallback(async () => {
    try {
      setLoadingThreads(true);
      const res = await chatService.getThreads();
      const loadedThreads = res.data.data || [];
      const activeThreads = loadedThreads.filter((t) => t.status === 'ACTIVE' || t.status === 'END_REQUESTED');
      setPtThreads(activeThreads);
      return activeThreads;
    } catch (err) {
      console.error("Fetch threads error:", err);
      return [];
    } finally {
      setLoadingThreads(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initChat = async () => {
      const loadedThreads = await loadChatThreads();
      if (!isMounted) return;

      if (loadedThreads.length > 0) {
        setActiveMappingId(prev => prev || loadedThreads[0].mappingId);
      }
    };
    if (activeTab === 'chat') {
      initChat();
    }
    return () => { isMounted = false; };
  }, [activeTab, loadChatThreads]);

  useEffect(() => {
    if (!activeMappingId || activeTab !== 'chat') return;

    const loadMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await chatService.getMessages(activeMappingId, { page: 0, size: 50 });
        const msgs = res.data.data.content || [];
        setMessages(msgs.reverse());
        await chatService.markRead(activeMappingId);
      } catch (err) {
        console.error("Fetch messages error:", err);
        toast.error('Lỗi khi tải tin nhắn');
      } finally {
        setLoadingMessages(false);
      }
    };
    loadMessages();
  }, [activeMappingId, activeTab]);

  useEffect(() => {
    if (activeTab !== 'chat') return;

    const handleNewMessage = (e) => {
      const newMsg = e.detail;
      if (!newMsg.createdAt) {
        newMsg.createdAt = new Date().toISOString();
      }
      if (newMsg.mappingId === activeMappingId) {
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        chatService.markRead(activeMappingId).catch(console.error);
      }
      loadChatThreads();
    };

    window.addEventListener('realtime_chat_message', handleNewMessage);
    return () => window.removeEventListener('realtime_chat_message', handleNewMessage);
  }, [activeMappingId, activeTab, loadChatThreads]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  useEffect(() => {
    return () => {
      if (selectedImagePreview) {
        URL.revokeObjectURL(selectedImagePreview);
      }
    };
  }, [selectedImagePreview]);

  const handleFile = (file) => {
    if (!file.type?.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh');
      return;
    }
    if (file.size > MAX_CHAT_IMAGE_SIZE) {
      toast.error('Ảnh quá lớn. Kích thước tối đa là 5MB.');
      return;
    }

    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImage(file);
    setSelectedImagePreview(URL.createObjectURL(file));
  };

  const handleImageSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFile(file);
    event.target.value = '';
  };

  const handlePaste = (e) => {
    const file = e.clipboardData?.files?.[0];
    if (file) {
      e.preventDefault();
      handleFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const clearSelectedImage = () => {
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImage(null);
    setSelectedImagePreview('');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if ((!newMessage.trim() && !selectedImage) || !activeMappingId) return;

    try {
      setSending(true);
      if (selectedImage) {
        const res = await chatService.sendImage(activeMappingId, selectedImage, newMessage);
        const sentMessage = res.data?.data;
        if (sentMessage) {
          setMessages((prev) => prev.some((m) => m.id === sentMessage.id) ? prev : [...prev, sentMessage]);
        }
        setNewMessage('');
        clearSelectedImage();
        return;
      }

      const success = sendWebSocketMessage('CHAT_SEND', {
        mappingId: activeMappingId,
        content: newMessage.trim()
      });

      if (success) {
        setNewMessage('');
      } else {
        toast.error('Mất kết nối máy chủ. Vui lòng F5 tải lại trang.');
      }
    } catch (err) {
      console.error("Send message error:", err);
      toast.error('Không thể gửi tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'PT';
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const activeThread = ptThreads.find(t => t.mappingId === activeMappingId);

  // Meal plan & Appointment service loads
  const fetchMealPlan = async (requestedWeekStart) => {
    setLoadingMealPlan(true);
    try {
      const weeksRes = await mealPlanService.getAvailableWeeks();
      const availableWeeks = weeksRes.data.data || [];
      setMealPlanWeeks(availableWeeks);

      const currentWeekStart = getCurrentWeekStart();
      const requestedWeekExists = availableWeeks.some(
        (week) => week.weekStart === requestedWeekStart,
      );
      const targetWeekStart = requestedWeekExists
        ? requestedWeekStart
        : (availableWeeks.find((week) => week.weekStart === currentWeekStart)?.weekStart
          || availableWeeks[0]?.weekStart);

      if (!targetWeekStart) {
        setMealPlan(null);
        setMealPlanItems([]);
        setMealPlanPrefWarnings([]);
        setMealPlanSuggestions([]);
        setSelectedMealPlanWeek('');
        return;
      }

      const res = await mealPlanService.getCurrent(targetWeekStart);
      setMealPlan(res.data.data?.plan || res.data.data?.[0] || res.data.data);
      setMealPlanItems(res.data.data?.items || []);
      setMealPlanPrefWarnings(res.data.data?.dietPrefWarnings || []);
      setSelectedMealPlanWeek(targetWeekStart);

      const suggestionsRes = await mealPlanService.getSuggestions(targetWeekStart);
      setMealPlanSuggestions(suggestionsRes.data.data || []);
      
      const sumRes = await mealPlanService.getWeeklySummaries();
      setWeeklySummaries(sumRes.data.data || []);
      setNewWeeklySummary(false);
    } catch {
      setMealPlan(null);
      setMealPlanItems([]);
      setMealPlanPrefWarnings([]);
      setMealPlanSuggestions([]);
    } finally {
      setLoadingMealPlan(false);
    }
  };

  const fetchAppointments = async () => {
    setLoadingAppts(true);
    try {
      const res = await appointmentService.getUpcoming();
      setAppointments(res.data.data || []);
    } catch {
      setAppointments([]);
    } finally {
      setLoadingAppts(false);
    }
  };

  const handleCancelAppointment = (apptId) => {
    setCancelApptId(apptId);
  };

  const confirmCancelAppointment = async () => {
    if (!cancelApptId) return;
    setCancellingAppt(true);
    try {
      await appointmentService.cancel(cancelApptId);
      toast.success('Đã hủy lịch hẹn');
      setCancelApptId(null);
      fetchAppointments();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Không hủy được lịch hẹn');
    } finally {
      setCancellingAppt(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!apptForm.ptId || !apptForm.startTime || !apptForm.endTime) {
      toast.error('Chọn PT và thời gian hẹn');
      return;
    }
    setBookingAppt(true);
    try {
      await appointmentService.book(apptForm.ptId, {
        startTime: apptForm.startTime?.length === 16 ? `${apptForm.startTime}:00` : apptForm.startTime,
        endTime: apptForm.endTime?.length === 16 ? `${apptForm.endTime}:00` : apptForm.endTime,
        type: 'ONLINE',
        note: apptForm.note || undefined,
      });
      toast.success('Đã gửi yêu cầu đặt lịch');
      setApptForm((f) => ({ ...f, startTime: '', endTime: '', note: '' }));
      fetchAppointments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể đặt lịch');
    } finally {
      setBookingAppt(false);
    }
  };

  const refreshMealPlanSuggestions = async () => {
    if (!selectedMealPlanWeek) return;
    try {
      const response = await mealPlanService.getSuggestions(selectedMealPlanWeek);
      setMealPlanSuggestions(response.data.data || []);
    } catch {
      // Keep the current snapshot if a background refresh fails.
    }
  };

  useEffect(() => {
    if (!selectedMealPlanWeek) return undefined;

    const handleReplacementUpdated = async () => {
      try {
        const [planResponse, suggestionsResponse] = await Promise.all([
          mealPlanService.getCurrent(selectedMealPlanWeek),
          mealPlanService.getSuggestions(selectedMealPlanWeek),
        ]);
        const planData = planResponse.data.data;
        setMealPlan(planData?.plan || planData?.[0] || planData);
        setMealPlanItems(planData?.items || []);
        setMealPlanPrefWarnings(planData?.dietPrefWarnings || []);
        setMealPlanSuggestions(suggestionsResponse.data.data || []);
      } catch {
        // The persisted notification remains available if this live refresh fails.
      }
    };

    window.addEventListener('meal_plan_replacement_updated', handleReplacementUpdated);
    return () => {
      window.removeEventListener('meal_plan_replacement_updated', handleReplacementUpdated);
    };
  }, [selectedMealPlanWeek]);

  const handleSuggestReplacement = (item) => {
    setReplacementModalItem(item);
  };

  const confirmReplacement = async (payload) => {
    if (!replacementModalItem) return;
    setSubmittingReplacement(true);
    try {
      await mealPlanService.suggestReplacement(replacementModalItem.id, payload);
      await refreshMealPlanSuggestions();
      setReplacementModalItem(null);
      toast.success('Đã gửi yêu cầu thay món cho PT');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không gửi được yêu cầu thay món');
    } finally {
      setSubmittingReplacement(false);
    }
  };

  const cancelReplacement = async (suggestionId) => {
    try {
      await mealPlanService.cancelReplacement(suggestionId);
      await refreshMealPlanSuggestions();
      toast.success('Đã hủy yêu cầu thay món');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể hủy yêu cầu');
    }
  };

  const handleOpenSkip = (item, mealItems, initialScope = 'ITEM') => {
    setSkipModalContext({ item, mealItems, initialScope });
  };

  const confirmSkipMeal = async ({ skipReason, skipNote, scope }) => {
    if (!skipModalContext) return;
    const { item, mealItems } = skipModalContext;
    setSkippingMeal(true);
    try {
      if (scope === 'MEAL') {
        await mealPlanService.skipMeal(mealPlan.id, {
          planDate: item.planDate,
          mealType: item.mealType,
          mealPeriod: item.mealPeriod,
          skipReason,
          skipNote,
        });
        const mealIds = new Set(mealItems.map((mealItem) => mealItem.id));
        setMealPlanItems((currentItems) => currentItems.map((currentItem) => (
          mealIds.has(currentItem.id)
            ? { ...currentItem, eaten: false, skipReason, skipNote }
            : currentItem
        )));
        toast.success('Đã ghi nhận không ăn cả bữa');
      } else {
        await mealPlanService.skipItem(item.id, { skipReason, skipNote });
        setMealPlanItems((currentItems) => currentItems.map((currentItem) => (
          currentItem.id === item.id
            ? { ...currentItem, eaten: false, skipReason, skipNote }
            : currentItem
        )));
        toast.success('Đã ghi nhận không ăn món');
      }
      setSkipModalContext(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật trạng thái không ăn');
    } finally {
      setSkippingMeal(false);
    }
  };

  const handleUndoSkip = async (itemId) => {
    try {
      await mealPlanService.unskipItem(itemId);
      setMealPlanItems((currentItems) => currentItems.map((item) => (
        item.id === itemId ? { ...item, skipReason: null, skipNote: null } : item
      )));
      toast.success('Đã hoàn tác');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể hoàn tác');
    }
  };

  const handleUndoEntireMeal = async (planDate, mealPeriod) => {
    try {
      const sample = mealPlanItems.find(
        (i) => i.planDate === planDate && i.mealPeriod === mealPeriod,
      );
      await mealPlanService.unskipMeal(mealPlan.id, {
        planDate,
        mealType: sample?.mealType,
        mealPeriod,
      });
      setMealPlanItems((currentItems) => currentItems.map((item) => (
        item.planDate === planDate && item.mealPeriod === mealPeriod
          ? { ...item, skipReason: null, skipNote: null }
          : item
      )));
      toast.success('Đã hoàn tác cả bữa');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể hoàn tác cả bữa');
    }
  };

  const applyMarkEaten = async (itemId, eaten, item, lateTickReason) => {
    await mealPlanService.markEaten(itemId, eaten, lateTickReason);
    setMealPlanItems((items) => items.map((i) => (
      i.id === itemId ? { ...i, eaten, lateTickReason: lateTickReason || i.lateTickReason } : i
    )));
    if (eaten) {
      if (item?.sourceType === 'SELF_OVERRIDE') {
        toast.success('Đã ghi vào nhật ký');
      } else {
        toast.success('Đã đánh dấu tuân thủ (chưa ghi nhật ký)');
      }
    }
  };

  const handleMarkEaten = async (itemId, eaten, itemRef) => {
    const item = itemRef || mealPlanItems.find((i) => i.id === itemId);
    try {
      if (
        eaten
        && item?.planDate === todayLocalIso()
        && item?.mealPeriod
        && canLateTickMealPeriod(item.planDate, item.mealPeriod, nowInVn())
      ) {
        setLateTickTarget({ itemId, item });
        return;
      }
      await applyMarkEaten(itemId, eaten, item);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật món ăn');
    }
  };

  const confirmLateTick = async (reason) => {
    if (!lateTickTarget) return;
    setLateTickLoading(true);
    try {
      await applyMarkEaten(lateTickTarget.itemId, true, lateTickTarget.item, reason);
      setLateTickTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Không thể cập nhật món ăn');
    } finally {
      setLateTickLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundForm.mappingId) {
      toast.error('Chọn PT để yêu cầu hoàn tiền');
      return;
    }
    setSubmittingRefund(true);
    try {
      await refundService.create({
        mappingId: refundForm.mappingId,
        reason: refundForm.reason,
        note: refundForm.note || undefined,
      });
      toast.success('Đã gửi yêu cầu hoàn tiền');
      setRefundForm((f) => ({ ...f, note: '' }));
      profileExtensionsService.getCoachingHistory().then((r) => setCoachingHistory(r.data?.data || [])).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.message || 'Không thể gửi yêu cầu');
    } finally {
      setSubmittingRefund(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in px-4">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Coaching Của Tôi</h1>
          <p className="text-slate-500 mt-1 font-medium">Tương tác với Huấn luyện viên, xem thực đơn và quản lý lịch hẹn tư vấn.</p>
        </div>
        {coachingWallet && (
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-2 text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-blue-600">Số dư ví coaching</p>
            <p className="text-lg font-black text-slate-900">
              {Number(coachingWallet.availableBalance || 0).toLocaleString('vi-VN')}đ
            </p>
          </div>
        )}
      </div>

      {openHireRequest && (
        <div className={`mb-6 rounded-3xl border p-5 shadow-sm ${openHireRequest.status === 'AWAITING_PAYMENT' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Yêu cầu coaching</p>
              <h2 className="mt-1 text-lg font-black text-slate-900">{openHireRequest.ptName}</h2>
              <p className="mt-1 text-sm font-semibold text-slate-600">
                Coaching {openHireRequest.selectedTrainingMode === 'OFFLINE' ? 'offline' : 'online'} ·{' '}
                {openHireRequest.selectedTrainingMode === 'OFFLINE' && openHireRequest.sessionCount
                  ? `Gói ${openHireRequest.sessionCount} buổi · ${Number(openHireRequest.agreedAmount || 0).toLocaleString('vi-VN')}đ`
                  : `${Number(openHireRequest.agreedAmount || 0).toLocaleString('vi-VN')}đ/${openHireRequest.agreedRateUnit}`}
              </p>
              <p className="mt-2 text-sm text-slate-600">
                {openHireRequest.status === 'AWAITING_PAYMENT'
                  ? 'PT đã chấp nhận. Thanh toán để kích hoạt chat, thực đơn và theo dõi tiến độ.'
                  : 'Đang chờ PT xem xét và phản hồi yêu cầu của bạn.'}
              </p>
              {openHireRequest.selectedTrainingMode === 'OFFLINE' && openHireRequest.venueName && (
                <div className="mt-3 rounded-2xl border border-emerald-200 bg-white/70 p-3">
                  <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
                    Gói offline {openHireRequest.sessionCount ? `· ${openHireRequest.sessionCount} buổi` : ''}
                  </p>
                  <p className="mt-1 text-sm font-bold text-slate-900">{openHireRequest.venueName}</p>
                  <p className="text-xs text-slate-600">{openHireRequest.venueAddress}</p>
                  {openHireRequest.perSessionAmount && openHireRequest.sessionCount && (
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      {openHireRequest.sessionCount} buổi × {Number(openHireRequest.perSessionAmount).toLocaleString('vi-VN')}đ
                    </p>
                  )}
                  {(openHireRequest.sessions || []).length > 0 ? (
                    <ul className="mt-2 space-y-1">
                      {openHireRequest.sessions.map((s) => (
                        <li key={s.id || s.sequence} className="text-xs font-semibold text-slate-700">
                          #{s.sequence}: {formatSessionRange(s.startTime, s.endTime)}
                        </li>
                      ))}
                    </ul>
                  ) : openHireRequest.firstSessionStart && (
                    <p className="mt-2 text-xs font-semibold text-slate-700">
                      {formatSessionRange(openHireRequest.firstSessionStart, openHireRequest.firstSessionEnd)}
                    </p>
                  )}
                </div>
              )}
              {openHireRequest.status === 'AWAITING_PAYMENT' && openHireRequest.paymentDueAt && (
                <p className="mt-1 text-xs font-bold text-amber-700">
                  Hạn thanh toán: {new Date(openHireRequest.paymentDueAt).toLocaleString('vi-VN')}
                </p>
              )}
            </div>
            {openHireRequest.status === 'AWAITING_PAYMENT' && (
              <Button onClick={startCoachingPayment} disabled={startingPayment} className="h-12 shrink-0 rounded-xl bg-emerald-600 px-6 font-black text-white hover:bg-emerald-700">
                {startingPayment ? 'Đang chuyển đến VNPay...' : 'Thanh toán ngay'}
              </Button>
            )}
          </div>
        </div>
      )}

      {ptThreads.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white border border-slate-200 rounded-3xl shadow-sm max-w-2xl mx-auto">
          <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-slate-800">Bạn chưa kết nối với Huấn luyện viên (PT)</h3>
          <p className="text-slate-500 mt-2 max-w-md mx-auto text-sm leading-relaxed">
            Hãy tìm kiếm và kết nối với các Huấn luyện viên chuyên nghiệp tại Chợ PT của NutriCan để nhận thực đơn và kế hoạch tập luyện cá nhân hóa.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link to="/marketplace">
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-6 py-5 font-bold shadow-md">
                Khám phá Chợ PT ngay
              </Button>
            </Link>
          </div>

          {coachingHistory.length > 0 && (
            <div className="mt-12 pt-8 border-t border-slate-100 text-left max-w-md mx-auto space-y-3">
              <p className="text-xs font-black text-slate-450 uppercase tracking-wider">Lịch sử coaching trước đây</p>
              {coachingHistory.map((h) => (
                <div key={h.mappingId} className="flex justify-between items-center text-sm text-slate-600 border border-slate-100 rounded-xl px-4 py-2.5 bg-slate-50/50">
                  <span className="font-bold text-slate-700">{h.ptName}</span>
                  <span className="text-xs text-slate-400">
                    {h.completedAt ? new Date(h.completedAt).toLocaleDateString('vi-VN') : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Navigation Sidebar */}
          <div className="w-full lg:w-72 shrink-0">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-1">
              {[
                { id: 'chat', label: 'Tin nhắn với PT', icon: MessageSquare, desc: 'Trò chuyện hỗ trợ trực tiếp' },
                { id: 'meal-plan', label: 'Thực đơn tuần', icon: Utensils, desc: 'Thực đơn dinh dưỡng từ PT' },
                { id: 'appointments', label: 'Lịch hẹn PT', icon: Calendar, desc: 'Đặt lịch và quản lý buổi hẹn' },
                { id: 'contract', label: 'Hợp đồng & Hoàn tiền', icon: BookOpen, desc: 'Yêu cầu kết thúc & Hoàn phí' }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-start gap-3.5 ${
                    activeTab === item.id
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <item.icon className={`w-5 h-5 mt-0.5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-sm">{item.label}</p>
                    <p className={`text-[10px] mt-0.5 truncate ${activeTab === item.id ? 'text-slate-300' : 'text-slate-400'}`}>{item.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel Content */}
          <div className="flex-1 min-w-0">
            
            {/* TAB 0: MESSAGING (CHAT) */}
            {activeTab === 'chat' && (
              <Card 
                className="w-full h-[600px] flex flex-col bg-white border-slate-200 shadow-sm rounded-3xl overflow-hidden relative animate-fade-in"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Drag Overlay */}
                {dragActive && (
                  <div className="absolute inset-0 bg-primary/10 backdrop-blur-sm z-50 flex flex-col items-center justify-center border-2 border-dashed border-primary m-4 rounded-2xl pointer-events-none animate-in fade-in duration-100">
                    <UploadCloud className="w-12 h-12 text-primary animate-bounce mb-2" />
                    <h3 className="text-lg font-bold text-slate-800">Thả hình ảnh vào đây</h3>
                    <p className="text-xs text-slate-500 mt-0.5">Để đính kèm và gửi trực tiếp cho PT</p>
                  </div>
                )}

                {ptThreads.length > 1 && (
                  <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex gap-2 overflow-x-auto items-center">
                    <span className="text-[10px] font-black text-slate-450 uppercase shrink-0">Chọn PT:</span>
                    {ptThreads.map((t) => (
                      <button
                        key={t.mappingId}
                        onClick={() => setActiveMappingId(t.mappingId)}
                        className={`text-xs px-3.5 py-1.5 rounded-full font-bold transition-all border ${
                          t.mappingId === activeMappingId
                            ? 'bg-slate-900 border-slate-900 text-white'
                            : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                        }`}
                      >
                        {t.participantName}
                      </button>
                    ))}
                  </div>
                )}

                {!activeMappingId ? (
                  <div className="flex-1 flex flex-col items-center justify-center bg-slate-50/30">
                    <MessageSquare className="w-12 h-12 text-slate-200 mb-2" />
                    <h3 className="text-base font-bold text-slate-700">Tin nhắn hỗ trợ từ PT</h3>
                    <p className="text-xs text-slate-500 mt-1">Chọn Huấn luyện viên để bắt đầu cuộc trò chuyện.</p>
                  </div>
                ) : (
                  <>
                    <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-center gap-3 z-10 shadow-sm">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs">
                        {activeThread?.participantAvatarUrl ? (
                          <img src={activeThread.participantAvatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                        ) : getInitials(activeThread?.participantName)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base">{activeThread?.participantName}</h3>
                        <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Huấn luyện viên trực tiếp
                        </p>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-4">
                      {loadingMessages ? (
                        <div className="flex flex-col gap-3">
                          <Skeleton className="h-14 w-2/3 rounded-2xl rounded-tl-none self-start bg-slate-200" />
                          <Skeleton className="h-14 w-2/3 rounded-2xl rounded-tr-none self-end bg-slate-200" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                          Gửi tin nhắn đầu tiên của bạn để trao đổi với PT!
                        </div>
                      ) : (
                        messages.map((msg, index) => {
                          const isMe = msg.senderId === user?.id;
                          return (
                            <div key={msg.id || index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                              <div className={`max-w-[75%] px-4 py-2.5 text-sm ${
                                isMe
                                  ? 'bg-slate-900 text-white rounded-2xl rounded-tr-sm shadow-sm'
                                  : 'bg-white border border-slate-200 text-slate-850 rounded-2xl rounded-tl-sm shadow-sm'
                              }`}>
                                  {msg.imageUrl && (
                                      <img
                                          src={msg.imageUrl}
                                          alt={msg.content || 'Ảnh gửi kèm'}
                                          onClick={() => setLightboxImage(msg.imageUrl)}
                                          className="mb-1.5 max-h-60 w-full rounded-xl object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
                                      />
                                  )}
                                  {msg.attachmentUrl && (
                                      <a
                                          href={msg.attachmentUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className={`mb-2 flex items-center gap-2 text-sm font-semibold underline ${isMe ? 'text-white/90' : 'text-blue-600'}`}
                                      >
                                          <FileText className="w-4 h-4 shrink-0" /> Tệp đính kèm (PDF)
                                      </a>
                                  )}
                                  {msg.content && <p className="leading-relaxed">{msg.content}</p>}
                              </div>
                              <span className="text-[9px] text-slate-400 mt-1 px-1.5 font-bold flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> {formatTime(msg.createdAt)}
                              </span>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3.5 bg-white border-t border-slate-100">
                      {selectedImagePreview && (
                        <div className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                          <img src={selectedImagePreview} alt="Attached preview" className="h-12 w-12 rounded-lg object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-800">{selectedImage?.name}</p>
                            <p className="text-[10px] text-slate-500">Ảnh sẽ được đính kèm cùng tin nhắn</p>
                          </div>
                          <button
                            type="button"
                            onClick={clearSelectedImage}
                            className="rounded-full p-1.5 text-slate-400 hover:bg-white hover:text-slate-700"
                            aria-label="Remove image"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                      <form onSubmit={handleSendMessage} className="flex items-end gap-2.5">
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleImageSelect}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={sending}
                          className="h-12 w-12 flex-shrink-0 rounded-xl border-slate-200 bg-white p-0 text-slate-650 hover:bg-slate-50"
                        >
                          <ImagePlus className="h-5 h-5" />
                        </Button>
                        <textarea
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onPaste={handlePaste}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleSendMessage();
                            }
                          }}
                          placeholder="Nhập nội dung tin nhắn... (Kéo thả ảnh hoặc Ctrl+V để đính kèm)"
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-slate-400 resize-none overflow-hidden max-h-24 min-h-[48px]"
                          rows="1"
                        />
                        <Button
                          type="submit"
                          disabled={(!newMessage.trim() && !selectedImage) || sending}
                          className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-12 w-12 flex-shrink-0 p-0 flex items-center justify-center border-0"
                        >
                          <Send className={`w-4 h-4 ${sending ? 'animate-pulse' : ''}`} />
                        </Button>
                      </form>
                    </div>
                  </>
                )}
              </Card>
            )}

            {/* TAB 1: MEAL PLAN */}
            {activeTab === 'meal-plan' && (
              <div className="space-y-6 animate-fade-in">
                {weeklySummaries.length > 0 && (
                  <div className="p-5 rounded-2xl bg-violet-50 border border-violet-100 space-y-2 shadow-sm">
                    <p className="text-xs font-black text-violet-700 uppercase tracking-widest flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Tổng kết tuần từ PT
                    </p>
                    {weeklySummaries.slice(0, 2).map((ws) => (
                      <div key={ws.id} className="text-sm text-slate-700 pt-2 border-t border-violet-200/50 first:border-0 first:pt-0">
                        <p className="font-bold text-slate-800">Tuần bắt đầu {ws.weekStartDate}
                          {ws.adherenceRate != null && <span className="text-violet-650 font-bold ml-2">Tỷ lệ tuân thủ: {ws.adherenceRate}%</span>}
                        </p>
                        <p className="text-slate-655 mt-1">{ws.summaryText}</p>
                        {ws.nextPlanNote && <p className="text-xs text-slate-500 mt-1.5 italic">Ghi chú tuần tới: {ws.nextPlanNote}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <Card className="border-slate-200 shadow-sm rounded-3xl bg-white">
                  <CardContent className="p-4 sm:p-6">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Utensils className="w-5 h-5 text-emerald-600" /> Thực đơn theo tuần
                      </h3>
                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                        {mealPlanWeeks.length > 0 && (
                          <MealPlanWeekPicker
                            weeks={mealPlanWeeks}
                            value={selectedMealPlanWeek}
                            loading={loadingMealPlan}
                            onChange={fetchMealPlan}
                          />
                        )}
                        {mealPlanItems.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={loadingMealPlan}
                            onClick={() => setGroceryModalOpen(true)}
                            className="w-full gap-2 rounded-xl text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100 font-bold sm:w-auto"
                          >
                            <ShoppingCart className="w-4 h-4" /> Danh sách đi chợ
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {loadingMealPlan ? (
                      <div className="flex justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                      </div>
                    ) : !mealPlanItems.length ? (
                      <div className="text-center py-12 bg-slate-50/50 border border-slate-100 rounded-2xl">
                        <Utensils className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-bold">
                          {ptThreads.length === 0 ? 'Bạn chưa có PT đang đồng hành' : 'Huấn luyện viên chưa lên thực đơn'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {ptThreads.length === 0 ? 'Bạn vẫn có thể tự lên kế hoạch tại Nhật ký → Plan ăn ngày.' : 'Liên hệ với PT qua tin nhắn để nhận được thực đơn tuần mới.'}
                        </p>
                        {ptThreads.length === 0 && (
                          <Link to="/diet" className="mt-3 inline-block text-xs font-bold text-emerald-700 hover:underline">
                            Mở Plan ăn ngày
                          </Link>
                        )}
                      </div>
                    ) : (
                      <MealPlanWeekView
                        items={mealPlanItems}
                        preferenceWarnings={mealPlanPrefWarnings}
                        suggestions={mealPlanSuggestions}
                        onMarkEaten={handleMarkEaten}
                        onSuggestReplacement={handleSuggestReplacement}
                        onCancelReplacement={cancelReplacement}
                        onOpenSkip={handleOpenSkip}
                        onUndoSkip={handleUndoSkip}
                        onUndoEntireMeal={handleUndoEntireMeal}
                      />
                    )}
                  </CardContent>
                </Card>

                <GroceryListModal
                  isOpen={groceryModalOpen}
                  onClose={() => setGroceryModalOpen(false)}
                  items={mealPlanItems}
                  weekStart={mealPlan?.weekStart ? new Date(mealPlan.weekStart) : new Date()}
                />
              </div>
            )}

            {/* TAB 2: APPOINTMENTS */}
            {activeTab === 'appointments' && (
              <Card className="border-slate-200 shadow-sm rounded-3xl bg-white animate-fade-in">
                <CardContent className="p-6 space-y-6">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-4 border-b border-slate-100">
                    <Calendar className="w-5 h-5 text-blue-600" /> Quản lý lịch hẹn với PT
                  </h3>

                  {loadingAppts ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50/50 border border-slate-100 rounded-2xl">
                      <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500 font-bold">Chưa có lịch hẹn sắp tới</p>
                      <p className="text-xs text-slate-400 mt-1">Sử dụng biểu mẫu bên dưới để tạo yêu cầu đặt lịch hẹn mới.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {appointments.map((a) => {
                        const badge = APPT_STATUS_LABEL[a.status] || { text: a.status, cls: 'bg-slate-100 text-slate-655' };
                        return (
                          <div key={a.id} className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 gap-3 hover:bg-slate-50/30 transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-800">
                                {new Date(a.startTime).toLocaleString('vi-VN')}
                              </p>
                              {a.type === 'OFFLINE' && a.venueName && (
                                <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                                  {a.venueName} · {a.venueAddress}
                                </p>
                              )}
                              {a.note && <p className="text-xs text-slate-500 mt-0.5">{a.note}</p>}
                              {a.cancelType && <p className="text-xs text-slate-400 mt-0.5">Hủy: {a.cancelType}</p>}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.text}</span>
                              {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                                <Button size="sm" variant="outline" className="text-xs font-bold rounded-lg border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleCancelAppointment(a.id)}>
                                  Hủy lịch
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Gửi yêu cầu lịch hẹn mới</p>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-650">Huấn luyện viên nhận hẹn</label>
                      <select value={apptForm.ptId} onChange={(e) => setApptForm((f) => ({ ...f, ptId: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white font-medium">
                        {ptThreads.map((t) => (
                          <option key={t.mappingId} value={t.participantId}>{t.participantName}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-650">Bắt đầu</label>
                        <input type="datetime-local" value={apptForm.startTime}
                          onChange={(e) => setApptForm((f) => ({ ...f, startTime: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-650">Kết thúc</label>
                        <input type="datetime-local" value={apptForm.endTime}
                          onChange={(e) => setApptForm((f) => ({ ...f, endTime: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-650">Ghi chú cuộc hẹn</label>
                      <input type="text" placeholder="Ghi chú thêm nội dung (tuỳ chọn)..." value={apptForm.note}
                        onChange={(e) => setApptForm((f) => ({ ...f, note: e.target.value }))}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm" />
                    </div>

                    <Button onClick={handleBookAppointment} disabled={bookingAppt} className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-6 font-bold shadow-md animate-fade-in">
                      {bookingAppt ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi yêu cầu đặt lịch'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TAB 3: CONTRACT & REFUND */}
            {activeTab === 'contract' && (
              <div className="space-y-6 animate-fade-in">
                <Card className="border-blue-100 shadow-sm rounded-3xl bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardContent className="p-6 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-blue-600">Ví coaching của bạn</p>
                      <p className="mt-1 text-2xl font-black text-slate-900">
                        {Number(coachingWallet?.availableBalance || 0).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    <p className="max-w-md text-xs font-semibold leading-5 text-slate-600">
                      Khoản hoàn tiền được ghi vào ví sau khi admin duyệt. Tiền đang tranh chấp vẫn được giữ trong escrow và không chuyển cho PT.
                    </p>
                  </CardContent>
                </Card>

                {/* Coaching status */}
                <Card className="border-slate-200 shadow-sm rounded-3xl bg-white">
                  <CardContent className="p-6 space-y-4">
                    <h3 className="text-lg font-bold text-slate-900 pb-3 border-b border-slate-100">Coaching với PT</h3>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500 font-medium">Trạng thái quan hệ hiện tại</p>
                        <p className="text-sm font-bold text-slate-800 mt-0.5">
                          {mappingStatus === 'END_REQUESTED' ? (
                            <span className="text-amber-600 flex items-center gap-1.5">
                              <AlertCircle className="w-4 h-4" /> Đang chờ xác nhận chấm dứt coaching
                            </span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1.5">
                              <Check className="w-4 h-4" /> Đang hoạt động (Active)
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {mappingStatus === 'END_REQUESTED' ? (
                          endRequestedBy === 'CUSTOMER' ? (
                            <Button disabled className="rounded-xl bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed">
                              Đang chờ Huấn luyện viên xác nhận kết thúc
                            </Button>
                          ) : (
                            <Button onClick={() => setEndCoachingModalOpen(true)} disabled={endCoachingLoading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20 font-bold px-5">
                              Xác nhận kết thúc coaching
                            </Button>
                          )
                        ) : (
                          <Button variant="outline" onClick={() => setEndCoachingModalOpen(true)} disabled={endCoachingLoading} className="rounded-xl border-amber-250 text-amber-800 hover:bg-amber-50 font-bold px-5">
                            Yêu cầu kết thúc coaching
                          </Button>
                        )}
                      </div>
                    </div>

                    {coachingHistory.length > 0 && (
                      <div className="space-y-2 pt-4 border-t border-slate-100">
                        <p className="text-xs font-black text-slate-450 uppercase tracking-widest">Lịch sử coaching trước đây</p>
                        {coachingHistory.map((h) => (
                          <div key={h.mappingId} className="flex justify-between items-center text-sm text-slate-650 border border-slate-100 rounded-xl px-4 py-2.5 bg-slate-50/50">
                            <span className="font-bold text-slate-700">{h.ptName}</span>
                            <span className="text-xs text-slate-400">
                              {h.completedAt ? new Date(h.completedAt).toLocaleDateString('vi-VN') : '—'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Refund Form */}
                <Card className="border-slate-200 shadow-sm rounded-3xl bg-white">
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Yêu cầu hoàn trả học phí</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Gửi yêu cầu khi có tranh chấp hoặc PT vi phạm cam kết. Escrow sẽ được khóa để admin xem xét.</p>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-650">Huấn luyện viên yêu cầu</label>
                        <select value={refundForm.mappingId} onChange={(e) => setRefundForm((f) => ({ ...f, mappingId: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white font-medium">
                          {ptThreads.map((t) => (
                            <option key={t.mappingId} value={t.mappingId}>{t.participantName}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-650">Lý do hoàn phí</label>
                        <select value={refundForm.reason} onChange={(e) => setRefundForm((f) => ({ ...f, reason: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white font-medium">
                          {REFUND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-655">Lý do chi tiết & Minh chứng</label>
                        <textarea value={refundForm.note} onChange={(e) => setRefundForm((f) => ({ ...f, note: e.target.value }))}
                          placeholder="Mô tả lý do chi tiết..." className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm h-24" />
                      </div>

                      <Button onClick={handleRefund} disabled={submittingRefund} variant="outline"
                        className="w-full border-red-250 text-red-750 hover:bg-red-50/50 rounded-xl py-6 font-bold flex items-center justify-center gap-2">
                        {submittingRefund ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gửi yêu cầu hoàn tiền'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

          </div>
        </div>
      )}

      {/* End coaching modal */}
      <Modal isOpen={endCoachingModalOpen} onClose={() => setEndCoachingModalOpen(false)}
        title={mappingStatus === 'END_REQUESTED' ? 'Xác nhận kết thúc coaching?' : 'Yêu cầu kết thúc coaching?'}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            {mappingStatus === 'END_REQUESTED'
              ? 'Xác nhận kết thúc huấn luyện. Hợp đồng sẽ chuyển sang hoàn tất sau khi bạn xác nhận.'
              : 'Gửi yêu cầu dừng chương trình huấn luyện. PT cần xác nhận để chấm dứt hợp đồng.'}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setEndCoachingModalOpen(false)} className="rounded-xl">Hủy</Button>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold" onClick={async () => {
              setEndCoachingLoading(true);
              try {
                if (mappingStatus === 'END_REQUESTED') {
                  await profileExtensionsService.confirmEndCoaching();
                  toast.success('Đã kết thúc huấn luyện');
                } else {
                  await profileExtensionsService.requestEndCoaching();
                  toast.success('Đã gửi yêu cầu kết thúc');
                }
                setEndCoachingModalOpen(false);
                fetchCoachingStatus();
              } catch (e) {
                toast.error(e.response?.data?.message || 'Không thể thực hiện');
              } finally {
                setEndCoachingLoading(false);
              }
            }} disabled={endCoachingLoading}>
              {endCoachingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Xác nhận'}
            </Button>
          </div>
        </div>
      </Modal>

      {replacementModalItem && (
        <MealReplacementModal
          open={true}
          item={replacementModalItem}
          saving={submittingReplacement}
          onClose={() => setReplacementModalItem(null)}
          onConfirm={confirmReplacement}
        />
      )}

      {/* Skip meal warning modal */}
      {skipModalContext && (
        <MealPlanSkipModal
          open={true}
          item={skipModalContext.item}
          mealItemCount={skipModalContext.mealItems.length}
          initialScope={skipModalContext.initialScope}
          onClose={() => setSkipModalContext(null)}
          onConfirm={confirmSkipMeal}
          saving={skippingMeal}
        />
      )}

      {/* Late tick reason — replaces window.prompt */}
      <LateTickReasonModal
        open={!!lateTickTarget}
        forPt
        loading={lateTickLoading}
        description="Buổi này đã qua. Hãy nhập lý do tick trễ để PT có thể theo dõi."
        onClose={() => !lateTickLoading && setLateTickTarget(null)}
        onSubmit={confirmLateTick}
      />

      <ConfirmModal
        open={!!cancelApptId}
        title="Hủy lịch hẹn?"
        description="Hủy trước 48h không phí; dưới 48h sẽ ghi nhận hủy muộn."
        confirmLabel="Hủy lịch"
        cancelLabel="Giữ lịch"
        danger
        loading={cancellingAppt}
        onClose={() => !cancellingAppt && setCancelApptId(null)}
        onConfirm={confirmCancelAppointment}
      />

      {/* Lightbox Preview */}
      <ImageLightbox
        isOpen={!!lightboxImage}
        imageUrl={lightboxImage}
        onClose={() => setLightboxImage('')}
      />
    </div>
  );
}
