"""
API route definitions.
"""

from django.urls import path
from .views import RouteAnalysisView, GeocodeSearchView, PresetsView

urlpatterns = [
    path("routes/analyze/", RouteAnalysisView.as_view(), name="routes-analyze"),
    path("geocoding/search/", GeocodeSearchView.as_view(), name="geocoding-search"),
    path("presets/", PresetsView.as_view(), name="presets-list"),
]
