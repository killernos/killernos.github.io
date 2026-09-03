const PS4_NEXT_API = "https://35.211.244.116";

async function getBackendHealth() {
    const response = await fetch(`${PS4_NEXT_API}/api/health`, {
        method: "GET",
        cache: "no-store"
    });

    if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
    }

    return response.json();
}

window.PS4NextBackend = {
    apiBase: PS4_NEXT_API,
    getHealth: getBackendHealth
};
