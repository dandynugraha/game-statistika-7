/*! coi-serviceworker v0.1.7 - Guido Zuidhof and contributors, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
    self.addEventListener("message", (ev) => {
        if (ev.data && ev.data.type === "deregister") {
            self.registration.unregister().then(() => {
                return self.clients.matchAll();
            }).then(clients => {
                clients.forEach((client) => client.navigate(client.url));
            });
        }
    });
    self.addEventListener("fetch", function (event) {
        if (event.request.cache === "only-if-cached" && event.request.mode !== "same-origin") {
            return;
        }
        event.respondWith(
            fetch(event.request).then((response) => {
                if (response.status === 0) {
                    return response;
                }
                const newHeaders = new Headers(response.headers);
                newHeaders.set("Cross-Origin-Embedder-Policy",
                    coepCredentialless ? "credentialless" : "require-corp"
                );
                newHeaders.set("Cross-Origin-Opener-Policy", "same-origin");
                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders,
                });
            }).catch((e) => console.error(e))
        );
    });
} else {
    (() => {
        const reloadedBySelf = window.sessionStorage.getItem("coiReloadedBySelf");
        window.sessionStorage.removeItem("coiReloadedBySelf");
        const coepDegrading = (reloadedBySelf === "coepdegrade");
        const n = navigator;
        if (n.serviceWorker && n.serviceWorker.controller) {
            n.serviceWorker.controller.postMessage({ type: "coepCredentialless", value: coepDegrading });
            if (reloadedBySelf === "fromInterception") {
                return;
            }
            if (window.crossOriginIsolated !== false || reloadedBySelf) return;
        }
        if (window.crossOriginIsolated !== false) return;
        if (!reloadedBySelf) {
            window.sessionStorage.setItem("coiReloadedBySelf", "fromInterception");
            n.serviceWorker.register(window.document.currentScript.src).then(
                (registration) => {
                    console.log("COOP/COEP Service Worker registered", registration.scope);
                    registration.addEventListener("updatefound", () => {
                        console.log("Reloading page to make use of updated service worker.");
                        window.sessionStorage.setItem("coiReloadedBySelf", "fromInterception");
                        window.location.reload();
                    });
                    if (registration.active && !n.serviceWorker.controller) {
                        console.log("Reloading page to make use of service worker.");
                        window.sessionStorage.setItem("coiReloadedBySelf", "fromInterception");
                        window.location.reload();
                    }
                },
                (err) => {
                    console.error("COOP/COEP Service Worker failed to register:", err);
                }
            );
        }
    })();
}
