const API_BASE_URL = import.meta.env.VITE_API_URL;

export const planTrip = async (tripData) => {
    const response = await fetch(`${API_BASE_URL}/trips/plan`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(tripData),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to plan trip.");
    }

    return data;
};


export const autocompleteLocation = async (searchText) => {
    const response = await fetch(
        `${API_BASE_URL}/locations/autocomplete?text=${encodeURIComponent(searchText)}`
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Failed to search locations.");
    }

    return data;
};