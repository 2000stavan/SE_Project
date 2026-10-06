package com.isms.trace;

import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class CallTraceAspect {

    private final CallTrace callTrace;

    public CallTraceAspect(CallTrace callTrace) {
        this.callTrace = callTrace;
    }

    @Pointcut("execution(public * com.isms.domain..*(..)) && !within(com.isms.domain.voice.VoiceInterpreter)")
    public void domainMethods() {}

    @Before("domainMethods()")
    public void recordCall(JoinPoint joinPoint) {
        String className = joinPoint.getTarget().getClass().getSimpleName();
        // Unwrap Spring CGLIB proxy if present
        if (className.contains("$$")) {
            className = className.substring(0, className.indexOf("$$"));
        }
        String methodName = joinPoint.getSignature().getName();
        callTrace.record(className, methodName);
    }
}
