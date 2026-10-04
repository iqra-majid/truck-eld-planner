from django.urls import path, re_path
from .views import plan_trip, autocomplete_location


urlpatterns = [
    re_path(r"^locations/autocomplete/?$", autocomplete_location, name="autocomplete-location"),
    re_path(r"^trips/plan/?$", plan_trip, name="plan-trip"),
]