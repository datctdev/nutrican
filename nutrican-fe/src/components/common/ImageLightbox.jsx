// src/components/common/ImageLightbox.jsx
import { useState, useEffect } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

export default function ImageLightbox({ isOpen, imageUrl, onClose }) {
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    useEffect(() => {
        if (!isOpen) {
            setScale(1);
            setRotation(0);
        }
    }, [isOpen]);

    if (!isOpen || !imageUrl) return null;

    const handleZoomIn = (e) => {
        e.stopPropagation();
        setScale(prev => Math.min(prev + 0.25, 3));
    };

    const handleZoomOut = (e) => {
        e.stopPropagation();
        setScale(prev => Math.max(prev - 0.25, 0.5));
    };

    const handleRotate = (e) => {
        e.stopPropagation();
        setRotation(prev => (prev + 90) % 360);
    };

    const handleReset = (e) => {
        e.stopPropagation();
        setScale(1);
        setRotation(0);
    };

    const handleDownload = async (e) => {
        e.stopPropagation();
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = imageUrl.split('/').pop() || 'downloaded-image.jpg';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download image', error);
            // Fallback download opening in new tab
            window.open(imageUrl, '_blank');
        }
    };

    return (
        <div 
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
            onClick={onClose}
        >
            {/* Top Toolbar */}
            <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/50 to-transparent flex items-center justify-between px-6 z-10">
                <span className="text-white/60 text-xs font-semibold select-none truncate max-w-[60%]">
                    Xem hình ảnh
                </span>
                
                <div className="flex items-center gap-3">
                    <button 
                        type="button"
                        onClick={handleZoomIn} 
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Phóng to"
                    >
                        <ZoomIn className="w-5 h-5" />
                    </button>
                    <button 
                        type="button"
                        onClick={handleZoomOut} 
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Thu nhỏ"
                    >
                        <ZoomOut className="w-5 h-5" />
                    </button>
                    <button 
                        type="button"
                        onClick={handleRotate} 
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Xoay ảnh"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <button 
                        type="button"
                        onClick={handleReset} 
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Đặt lại"
                    >
                        <span className="text-xs font-bold font-sans">1:1</span>
                    </button>
                    <button 
                        type="button"
                        onClick={handleDownload} 
                        className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Tải xuống"
                    >
                        <Download className="w-5 h-5" />
                    </button>
                    <div className="w-[1px] h-6 bg-white/20 mx-1" />
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-2 text-white/85 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Đóng (Esc)"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Main Image Viewport */}
            <div className="relative flex-1 w-full flex items-center justify-center p-4 overflow-hidden select-none">
                <img
                    src={imageUrl}
                    alt="Lightbox Preview"
                    style={{
                        transform: `scale(${scale}) rotate(${rotation}deg)`,
                        transition: 'transform 0.25s cubic-bezier(0.1, 0.7, 0.1, 1)'
                    }}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        </div>
    );
}
