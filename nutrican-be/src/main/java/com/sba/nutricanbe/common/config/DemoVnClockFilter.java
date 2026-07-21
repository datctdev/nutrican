package com.sba.nutricanbe.common.config;

import com.sba.nutricanbe.common.util.DietDates;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.LocalDateTime;

/**
 * Local/demo only: honor {@link DietDates#DEMO_CLOCK_HEADER} so FE can simulate VN wall clock
 * (e.g. 21:00) without changing the OS timezone.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 20)
public class DemoVnClockFilter extends OncePerRequestFilter {

    private final boolean allowClientClock;

    public DemoVnClockFilter(
            @Value("${nutrican.demo.allow-client-clock:true}") boolean allowClientClock,
            @Value("${nutrican.demo.vn-clock:}") String fixedClock) {
        this.allowClientClock = allowClientClock;
        LocalDateTime fixed = DietDates.parseDemoClock(fixedClock);
        DietDates.setFixedOverride(fixed);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        try {
            if (allowClientClock) {
                LocalDateTime override = DietDates.parseDemoClock(request.getHeader(DietDates.DEMO_CLOCK_HEADER));
                if (override != null) {
                    DietDates.setRequestOverride(override);
                }
            }
            filterChain.doFilter(request, response);
        } finally {
            DietDates.clearRequestOverride();
        }
    }
}
