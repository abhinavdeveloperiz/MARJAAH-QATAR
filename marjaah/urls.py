from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('en/', include(('store.urls', 'store'), namespace='en')),
    path('ar/', include(('store.urls_ar', 'store_ar'), namespace='ar')),
    path('', RedirectView.as_view(url='/en/', permanent=False)),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.BASE_DIR / 'static'}),
    re_path(r'^images/(?P<path>.*)$', serve, {'document_root': settings.BASE_DIR / 'static' / 'images'}),
    re_path(r'^favicon\.ico$', serve, {'document_root': settings.BASE_DIR / 'static', 'path': 'favicon.ico'}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)


