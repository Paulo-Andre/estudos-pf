class SecurityHeadersMiddleware:
    def __init__(self,get_response):
        self.get_response=get_response
    def __call__(self,request):
        response=self.get_response(request)
        response.setdefault("Content-Security-Policy",
            "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; "
            "script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; "
            "font-src 'self' data:; connect-src 'self' https:; media-src 'self' blob: https:; "
            "worker-src 'self' blob:; form-action 'self'; upgrade-insecure-requests")
        response.setdefault("Permissions-Policy","camera=(), microphone=(), geolocation=(), usb=(), payment=(self)")
        response.setdefault("Cross-Origin-Resource-Policy","same-origin")
        response.setdefault("Cross-Origin-Opener-Policy","same-origin")
        return response
