"""Exception classes for the Airport Flight Data SDK"""


class APIError(Exception):
    """Base exception for API errors"""
    
    def __init__(self, message, status_code=None, response=None):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.response = response


class AuthenticationError(APIError):
    """Raised when authentication fails"""
    pass


class RateLimitError(APIError):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, message, retry_after=None, *args, **kwargs):
        super().__init__(message, *args, **kwargs)
        self.retry_after = retry_after


class NotFoundError(APIError):
    """Raised when a resource is not found"""
    pass


class ValidationError(APIError):
    """Raised when request validation fails"""
    pass


class WebSocketError(Exception):
    """Base exception for WebSocket errors"""
    
    def __init__(self, message, code=None):
        super().__init__(message)
        self.message = message
        self.code = code


class ConnectionError(WebSocketError):
    """Raised when WebSocket connection fails"""
    pass


class SubscriptionError(WebSocketError):
    """Raised when subscription operations fail"""
    pass