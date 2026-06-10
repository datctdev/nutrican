package com.sba.nutrican_be.core.config;

import com.sba.nutrican_be.core.entity.User;
import org.springframework.core.MethodParameter;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

@Component
public class CurrentUserArgumentResolver implements HandlerMethodArgumentResolver {

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(CurrentUser.class)
                && parameter.getParameterType().equals(CurrentUserInfo.class);
    }

    @Override
    public Object resolveArgument(
            MethodParameter parameter,
            ModelAndViewContainer mavContainer,
            NativeWebRequest webRequest,
            WebDataBinderFactory binderFactory) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null) return null;

        Object principal = auth.getPrincipal();

        if (principal instanceof CurrentUserInfo info) {
            return info;
        }

        if (principal instanceof User user) {
            CurrentUserInfo info = new CurrentUserInfo();
            info.setUserId(user.getId());
            info.setUsername(user.getEmail());
            if (user.getRole() != null) {
                info.setRole(user.getRole().name());
            }
            return info;
        }

        return null;
    }
}
