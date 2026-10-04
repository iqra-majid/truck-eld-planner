import { useEffect, useState, useRef } from "react";
import { autocompleteLocation } from "../services/api";

function LocationAutocomplete({ label, name, value, onChange }) {
    const [searchText, setSearchText] = useState(value?.name || "");
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const isSelectedRef = useRef(false);
    const containerRef = useRef(null);

    // Sync searchText if value prop changes externally
    useEffect(() => {
        if (value?.name && value.name !== searchText) {
            setSearchText(value.name);
            isSelectedRef.current = true;
        }
    }, [value]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Debounced location search
    useEffect(() => {
        if (isSelectedRef.current) {
            isSelectedRef.current = false;
            return;
        }

        if (searchText.trim().length < 2) {
            setSuggestions([]);
            setIsOpen(false);
            return;
        }

        const searchLocations = async () => {
            setIsLoading(true);

            try {
                const locations = await autocompleteLocation(searchText);
                setSuggestions(locations);
                setIsOpen(true);
            } catch (error) {
                console.error("Location search failed:", error);
                setSuggestions([]);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(searchLocations, 300);

        return () => clearTimeout(timer);
    }, [searchText]);

    const handleSearchChange = (event) => {
        const newSearchText = event.target.value;

        isSelectedRef.current = false;
        setSearchText(newSearchText);

        if (value) {
            onChange(name, null);
        }
    };

    const handleSelectLocation = (location) => {
        isSelectedRef.current = true;
        setSearchText(location.name);
        setSuggestions([]);
        setIsOpen(false);

        onChange(name, location);
    };

    return (
        <div ref={containerRef} className="relative">
            <label
                htmlFor={name}
                className="mb-2 block text-sm font-medium text-slate-700"
            >
                {label}
            </label>

            <input
                id={name}
                type="text"
                value={searchText}
                onChange={handleSearchChange}
                onFocus={() => {
                    if (suggestions.length > 0 && !isSelectedRef.current) {
                        setIsOpen(true);
                    }
                }}
                placeholder={`Enter ${label.toLowerCase()}`}
                required
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />

            {isLoading && (
                <p className="mt-2 text-xs text-orange-600">
                    Searching locations...
                </p>
            )}

            {isOpen && suggestions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {suggestions.map((location) => (
                        <button
                            key={`${location.name}-${location.coordinates.join(",")}`}
                            type="button"
                            onClick={() => handleSelectLocation(location)}
                            className="block w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 last:border-b-0 hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                        >
                            {location.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

export default LocationAutocomplete;