from django.conf import settings

class SecurityHeadersMiddleware:
    def __init__(self,get_response):
        self.get_response=get_response
    def __call__(self,request):
        response=self.get_response(request)
        csp=(
            "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
            "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; "
            "font-src 'self' data:; connect-src 'self'; media-src 'self' blob: https:; "
            "worker-src 'self' blob:; form-action 'self'"
        )
        if not settings.DEBUG:csp+="; upgrade-insecure-requests"
        response.setdefault("Content-Security-Policy",csp)
        response.setdefault("Permissions-Policy","camera=(), microphone=(), geolocation=(), usb=(), payment=()")
        response.setdefault("Cross-Origin-Resource-Policy","same-origin")
        response.setdefault("Cross-Origin-Opener-Policy","same-origin")
        return response
