package com.isms.trace;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Component
public class CallTrace {

    private static final ThreadLocal<List<String>> TRACE = ThreadLocal.withInitial(ArrayList::new);

    public void record(String className, String methodName) {
        TRACE.get().add(className + "." + methodName);
    }

    public List<String> getCalls() {
        return Collections.unmodifiableList(new ArrayList<>(TRACE.get()));
    }

    public void clear() {
        TRACE.get().clear();
    }

    public boolean containsSequence(String... expectedCalls) {
        List<String> actual = TRACE.get();
        int expectedIndex = 0;
        for (String call : actual) {
            if (expectedIndex < expectedCalls.length && call.equals(expectedCalls[expectedIndex])) {
                expectedIndex++;
            }
        }
        return expectedIndex == expectedCalls.length;
    }
}
