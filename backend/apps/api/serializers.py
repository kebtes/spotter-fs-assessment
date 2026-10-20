"""
DRF Serializers for route analysis and location search.
"""

from rest_framework import serializers
from datetime import datetime, timezone


class LocationInputSerializer(serializers.Serializer):
    label = serializers.CharField(max_length=255, required=False, default="")
    latitude = serializers.FloatField(min_value=-90.0, max_value=90.0)
    longitude = serializers.FloatField(min_value=-180.0, max_value=180.0)


class RouteAnalysisRequestSerializer(serializers.Serializer):
    origin = LocationInputSerializer()
    destination = LocationInputSerializer()
    departure_time = serializers.DateTimeField(required=False, default=serializers.CreateOnlyDefault(lambda: datetime.now(timezone.utc)))
    load_weight_lbs = serializers.FloatField(min_value=0.0, max_value=150000.0, default=30000.0)
    sampling_interval_miles = serializers.ChoiceField(choices=[10, 25, 50], default=25)


class GeocodeQuerySerializer(serializers.Serializer):
    q = serializers.CharField(max_length=200, required=True)
    limit = serializers.IntegerField(min_value=1, max_value=10, default=5)
