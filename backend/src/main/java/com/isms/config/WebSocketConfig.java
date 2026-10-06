package com.isms.config;

import com.isms.websocket.AlertWebSocketHandler;
import com.isms.websocket.StockWebSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final StockWebSocketHandler stockWebSocketHandler;
    private final AlertWebSocketHandler alertWebSocketHandler;

    public WebSocketConfig(StockWebSocketHandler stockWebSocketHandler, AlertWebSocketHandler alertWebSocketHandler) {
        this.stockWebSocketHandler = stockWebSocketHandler;
        this.alertWebSocketHandler = alertWebSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(stockWebSocketHandler, "/ws/stock")
                .setAllowedOrigins("*");
        registry.addHandler(alertWebSocketHandler, "/ws/alerts")
                .setAllowedOrigins("*");
    }
}
