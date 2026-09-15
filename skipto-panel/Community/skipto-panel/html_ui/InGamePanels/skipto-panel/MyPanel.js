(function (root) {
    'use strict';

    if (root.GeoMath) return;

    var WGS84 = {
        semiMajorAxisMeters: 6378137.0,
        semiMinorAxisMeters: 6356752.314245,
        flattening: 1 / 298.257223563
    };

    function toRadians(value) {
        return value * Math.PI / 180;
    }

    function toDegrees(value) {
        return value * 180 / Math.PI;
    }

    function normalizeDegrees(value) {
        var degrees = value % 360;
        return degrees < 0 ? degrees + 360 : degrees;
    }

    function haversineDistanceNm(lat1, lon1, lat2, lon2) {
        var earthRadiusNm = 3440.065;
        var φ1 = toRadians(lat1);
        var φ2 = toRadians(lat2);
        var Δφ = toRadians(lat2 - lat1);
        var Δλ = toRadians(lon2 - lon1);

        var a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
            + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusNm * c;
    }

    function vincentyDistanceMeters(lat1, lon1, lat2, lon2) {
        var a = WGS84.semiMajorAxisMeters;
        var b = WGS84.semiMinorAxisMeters;
        var f = WGS84.flattening;

        var φ1 = toRadians(lat1);
        var φ2 = toRadians(lat2);
        var L = toRadians(lon2 - lon1);

        var U1 = Math.atan((1 - f) * Math.tan(φ1));
        var U2 = Math.atan((1 - f) * Math.tan(φ2));
        var sinU1 = Math.sin(U1);
        var cosU1 = Math.cos(U1);
        var sinU2 = Math.sin(U2);
        var cosU2 = Math.cos(U2);

        var sinSigma = 0;
        var cosSigma = 0;
        var sigma = 0;
        var sinAlpha = 0;
        var cosSqAlpha = 0;
        var cos2SigmaM = 0;

        var lambda = L;
        var lambdaPrev = 0;
        var maxIterations = 200;

        for (var iteration = 0; iteration < maxIterations; iteration += 1) {
            var sinLambda = Math.sin(lambda);
            var cosLambda = Math.cos(lambda);

            sinSigma = Math.sqrt(
                (cosU2 * sinLambda) * (cosU2 * sinLambda)
                + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
                * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda)
            );

            if (sinSigma === 0) {
                return 0;
            }

            cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
            sigma = Math.atan2(sinSigma, cosSigma);
            sinAlpha = (cosU1 * cosU2 * sinLambda) / sinSigma;
            cosSqAlpha = 1 - sinAlpha * sinAlpha;

            if (cosSqAlpha !== 0) {
                cos2SigmaM = cosSigma - (2 * sinU1 * sinU2) / cosSqAlpha;
            } else {
                cos2SigmaM = 0;
            }

            var C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
            lambdaPrev = lambda;
            lambda = L + (1 - C) * f * sinAlpha * (
                sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM))
            );

            if (Math.abs(lambda - lambdaPrev) < 1e-12) {
                break;
            }
        }

        if (Math.abs(lambda - lambdaPrev) >= 1e-12) {
            return Number.NaN;
        }

        var uSq = cosSqAlpha * ((a * a) - (b * b)) / (b * b);
        var A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
        var B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
        var deltaSigma = B * sinSigma * (
            cos2SigmaM + (B / 4) * (
                cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)
                - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)
            )
        );

        var meters = b * A * (sigma - deltaSigma);
        return meters;
    }

    function geodesicDistanceNm(lat1, lon1, lat2, lon2) {
        if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
            return Number.NaN;
        }

        var distanceMeters = vincentyDistanceMeters(lat1, lon1, lat2, lon2);
        if (Number.isFinite(distanceMeters)) {
            return distanceMeters / 1852.0;
        }

        return haversineDistanceNm(lat1, lon1, lat2, lon2);
    }

    function geodesicBearingDegrees(lat1, lon1, lat2, lon2) {
        if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
            return Number.NaN;
        }

        var φ1 = toRadians(lat1);
        var φ2 = toRadians(lat2);
        var λ = toRadians(lon2 - lon1);

        var y = Math.sin(λ) * Math.cos(φ2);
        var x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ);
        var bearing = Math.atan2(y, x);
        return normalizeDegrees(toDegrees(bearing));
    }

    root.GeoMath = {
        toRadians: toRadians,
        toDegrees: toDegrees,
        normalizeDegrees: normalizeDegrees,
        geodesicDistanceNm: geodesicDistanceNm,
        geodesicBearingDegrees: geodesicBearingDegrees,
        haversineDistanceNm: haversineDistanceNm
    };
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : {})));

class MyPanel extends TemplateElement {
    constructor() {
        super(...arguments);
        this.debugEnabled = true;
        this.version = "v1.1.0";
        this.longDistanceThresholdNm = 30;
        this.longDistancePauseMs = 1500;
        this.longDistancePressureThresholdInHg = 0.03;
        this.longDistanceAirspeedThresholdKts = 5;
        this.initialize();
    }

    connectedCallback() {
        super.connectedCallback();
        this.initialize();
    }

    disconnectedCallback() {
        this.stopAutoRefresh();
    }

    initialize() {
        // Avoid re-binding handlers if the panel has already been initialized.
        if (this.started) return;
        try {
            // Keep a reference to the host UI and all text elements used for status updates.
            this.ingameUi = this.querySelector("ingame-ui");

            this.txtDebugLog = this.querySelector('#txt-debug-log');
            this.txtDebugLogLabel = this.querySelector('#debug-log-label');
            this.statusNode = this.querySelector('#flightplan-status');
            this.identNode = this.querySelector('#next-waypoint-ident');
            this.typeNode = this.querySelector('#next-waypoint-type');
            this.latNode = this.querySelector('#next-waypoint-lat');
            this.lonNode = this.querySelector('#next-waypoint-lon');
            this.distanceNode = this.querySelector('#next-waypoint-distance');
            this.headingNode = this.querySelector('#next-waypoint-heading');

            // Wire up the action buttons and dropdown to panel behavior.
            this.btnTeleport = this.querySelector('#btnTeleport');
            this.btnRefresh = this.querySelector('#btnRefresh');
            this.waypointSelect = this.querySelector('#waypoint-select');
            this.manualWaypointInput = this.querySelector('#manual-waypoint-input');
            this.btnLookup = this.querySelector('#btnLookup');

            if (this.btnTeleport) this.btnTeleport.addEventListener('click', () => this.onTeleportClicked());
            if (this.btnRefresh) this.btnRefresh.addEventListener('click', () => this.refreshWaypointState());
            if (this.waypointSelect) this.waypointSelect.addEventListener('change', () => this.onWaypointSelected());
            if (this.btnLookup) this.btnLookup.addEventListener('click', () => this.onLookupClicked());

            this.refreshIntervalMs = 2000;
            this.refreshTimer = null;
            this.started = true;
            // Disabled for now; manual Refresh remains available.
            // this.startAutoRefresh();
            this.refreshWaypointState();
        } catch (e) {
            this.log(`Error in initialize: ${e}`, 'ERROR');
        }
    }

    startAutoRefresh() {
        if (this.refreshTimer) return;
        this.refreshTimer = setInterval(() => {
            try {
                this.refreshWaypointState();
            } catch (e) {
                this.log(`Auto refresh failed: ${e && e.message ? e.message : e}`, 'WARN');
            }
        }, this.refreshIntervalMs || 2000);
    }

    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
        }
    }

    log(msg = '', level = 'DEBUG') {
        if (!this.debugEnabled || !this.txtDebugLog) return;
        try { console.log(msg); } catch (e) { }

        let s;
        if (typeof msg === 'string') s = msg;
        else if (msg && msg.message) s = msg.message;
        else {
            try { s = JSON.stringify(msg); } catch (e) { s = String(msg); }
        }

        this.txtDebugLog.value = (this.txtDebugLog.value ? this.txtDebugLog.value + '\r\n' : '') + '[' + level.toUpperCase() + '] ' + s;
        this.txtDebugLog.scrollTop = this.txtDebugLog.scrollHeight;
    }

    getSimVar(name, unit, fallback) {
        // Read a numeric sim variable and fall back cleanly if the value is unavailable.
        try {
            const value = SimVar.GetSimVarValue(name, unit);
            if (typeof value === 'number' && Number.isFinite(value)) return value;
            return fallback;
        } catch (e) {
            return fallback;
        }
    }

    getStringVar(name, fallback) {
        try {
            const value = SimVar.GetSimVarValue(name, 'string');
            const text = (value === null || value === undefined) ? '' : String(value).trim();
            return text || fallback;
        } catch (e) {
            return fallback;
        }
    }

    getSingleSimVar(name, unit, fallback) {
        try {
            const value = SimVar.GetSimVarValue(name, unit);
            if (typeof value === 'number' && Number.isFinite(value)) {
                this.log(`Resolved ${name} (${unit}) = ${value}`, 'DEBUG');
                return value;
            }
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                this.log(`Resolved ${name} (${unit}) = ${value}`, 'DEBUG');
                return value;
            }
            this.log(`${name} (${unit}) returned empty value`, 'DEBUG');
            return fallback;
        } catch (e) {
            this.log(`${name} (${unit}) failed: ${e && e.message ? e.message : e}`, 'DEBUG');
            return fallback;
        }
    }

    getSingleStringVar(name, fallback) {
        try {
            const value = SimVar.GetSimVarValue(name, 'string');
            const text = (value === null || value === undefined) ? '' : String(value).trim();
            if (text) {
                this.log(`Resolved string ${name} = ${text}`, 'DEBUG');
                return text;
            }
            this.log(`${name} returned an empty string`, 'DEBUG');
            return fallback;
        } catch (e) {
            this.log(`${name} failed: ${e && e.message ? e.message : e}`, 'DEBUG');
            return fallback;
        }
    }

    formatCoordinate(value) {
        if (!Number.isFinite(value)) return '--';
        return value.toFixed(5);
    }

    formatAltitude(value) {
        if (!Number.isFinite(value)) return '--';
        return `${Math.round(value)} ft`;
    }

    getGeoMath() {
        var root = (typeof window !== 'undefined' && window)
            || (typeof self !== 'undefined' && self)
            || (typeof global !== 'undefined' && global)
            || {};

        this.log(`GeoMath lookup root: ${root && root.constructor ? root.constructor.name : typeof root}`, 'DEBUG');

        var geoMath = root && root.GeoMath;
        this.log(`GeoMath object present: ${!!geoMath}`, 'DEBUG');

        if (geoMath) {
            this.log(`GeoMath keys: ${Object.keys(geoMath).join(', ')}`, 'DEBUG');
        }

        if (!geoMath || typeof geoMath.geodesicBearingDegrees !== 'function' || typeof geoMath.geodesicDistanceNm !== 'function' || typeof geoMath.toRadians !== 'function') {
            this.log('GeoMath is not available; coordinate math cannot run.', 'ERROR');
            return null;
        }
        return geoMath;
    }

    calculateBearingDegrees(startLat, startLon, endLat, endLon) {
        const geoMath = this.getGeoMath();
        if (!geoMath) return Number.NaN;
        return geoMath.geodesicBearingDegrees(startLat, startLon, endLat, endLon);
    }

    toRadians(value) {
        const geoMath = this.getGeoMath();
        if (!geoMath) return Number.NaN;
        return geoMath.toRadians(value);
    }

    wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    pauseSimulation(paused) {
        try {
            const command = paused ? 'K:PAUSE_ON' : 'K:PAUSE_OFF';
            SimVar.SetSimVarValue(command, 'number', 1);
            this.log(`Simulation ${paused ? 'paused' : 'resumed'} for long-distance teleport.`, 'DEBUG');
        } catch (e) {
            this.log(`Unable to ${paused ? 'pause' : 'resume'} the sim: ${e}`, 'WARN');
        }
    }

    getDistanceFromAircraftNm(latA, lonA, latB, lonB) {
        try {
            const geoMath = this.getGeoMath();
            if (!geoMath) return Number.NaN;
            const value = geoMath.geodesicDistanceNm(latA, lonA, latB, lonB);
            return Number.isFinite(value) ? value : Number.NaN;
        } catch (e) {
            this.log(`Distance calculation failed: ${e && e.message ? e.message : e}`, 'WARN');
            return Number.NaN;
        }
    }

    getWaypointEntries() {
        // Use the active GPS next waypoint as the panel target when it is available.
        const id = this.getSingleStringVar('GPS WP NEXT ID', '');
        this.log(`Next waypoint ID: ${id}`, 'DEBUG');
        if (!id || id === '--') return [];

        return [{
            ident: id,
            type: 'WAYPOINT',
            lat: this.getSingleSimVar('GPS WP NEXT LAT', 'degrees', 0),
            lon: this.getSingleSimVar('GPS WP NEXT LON', 'degrees', 0),
            alt: this.getSingleSimVar('GPS WP NEXT ALT', 'feet', 0)
        }];
    }

    onWaypointSelected() {
        if (!this.waypointSelect) return;
        const selectedValue = this.waypointSelect.value;
        if (!selectedValue) return;

        try {
            const selected = JSON.parse(selectedValue);
            this.identNode.textContent = selected.ident;
            this.typeNode.textContent = String(selected.type || 'WAYPOINT').toUpperCase();
            this.latNode.textContent = this.formatCoordinate(selected.lat);
            this.lonNode.textContent = this.formatCoordinate(selected.lon);
            this.statusNode.textContent = 'Route fix selected';
        } catch (e) {
            this.log(`Failed to parse selected waypoint: ${e}`, 'WARN');
        }
    }

    async onLookupClicked() {
        const text = this.manualWaypointInput ? this.manualWaypointInput.value : '';
        this.log(`Lookup button pressed with text: "${text}"`, 'INFO');
        const url = `https://skyvector.com/api/search?q=${encodeURIComponent(text)}&i=301&z=21&ck=&lat=0.0&lon=0.0&rand=12345`;

        try {
            const response = await fetch(url);
            const body = await response.text();
            this.log(`Lookup response code: ${response.status}`, 'INFO');
            this.log(`Lookup response body: ${body}`, 'INFO');
        } catch (e) {
            this.log(`Lookup request failed: ${e && e.message ? e.message : e}`, 'ERROR');
        }
    }

    refreshWaypointState() {
        try {
            // Refresh the current route target and update all status labels in the panel.
            this.log('Refreshing waypoint state... ', 'DEBUG');
            var geoMath = this.getGeoMath();
            this.log(`GeoMath available during refresh: ${!!geoMath}`, 'DEBUG');
            const entries = this.getWaypointEntries();

            if (entries.length === 0) {
                this.statusNode.textContent = 'Waypoint data unavailable';
                this.identNode.textContent = 'N/A';
                this.typeNode.textContent = 'Unavailable';
                this.latNode.textContent = '--';
                this.lonNode.textContent = '--';
                if (this.waypointSelect) {
                    this.waypointSelect.innerHTML = '<option value="">No waypoint data</option>';
                    this.waypointSelect.selectedIndex = 0;
                }
                this.log('No valid next waypoint data is available.', 'INFO');
                return;
            }

            const selected = entries[0];

            if (this.waypointSelect) {
                this.waypointSelect.innerHTML = '';
                const option = document.createElement('option');
                option.value = JSON.stringify(selected);
                option.textContent = `${selected.ident} (${String(selected.type || 'WAYPOINT').toUpperCase()})`;
                this.waypointSelect.appendChild(option);
                this.waypointSelect.selectedIndex = 0;
            }

            // Distance is informational only; keep the waypoint coordinates visible even if math fails.
            const currentLat = this.getSimVar('PLANE LATITUDE', 'degrees', Number.NaN);
            const currentLon = this.getSimVar('PLANE LONGITUDE', 'degrees', Number.NaN);
            let waypointDistanceNm = Number.NaN;
            if (Number.isFinite(currentLat) && Number.isFinite(currentLon)) {
                try {
                    waypointDistanceNm = this.getDistanceFromAircraftNm(currentLat, currentLon, Number(selected.lat), Number(selected.lon));
                } catch (e) {
                    waypointDistanceNm = Number.NaN;
                    this.log(`Distance read skipped: ${e && e.message ? e.message : e}`, 'WARN');
                }
            }

            this.statusNode.textContent = 'Waypoint available';
            this.identNode.textContent = selected.ident;
            this.typeNode.textContent = String(selected.type || 'WAYPOINT').toUpperCase();
            this.latNode.textContent = this.formatCoordinate(selected.lat);
            this.lonNode.textContent = this.formatCoordinate(selected.lon);
            this.distanceNode.textContent = Number.isFinite(waypointDistanceNm) ? `${waypointDistanceNm.toFixed(1)} NM` : '--';

            this.log(`Waypoint ready: ${selected.ident}. Distance to waypoint: ${Number.isFinite(waypointDistanceNm) ? waypointDistanceNm.toFixed(1) : '--'} NM.`);
        } catch (e) {
            this.log(`Error reading waypoint state: ${e}`, 'ERROR');
        }
    }

    async onTeleportClicked() {
        try {
            // Read the currently selected route fix and reject the action if it is invalid.
            let target = null;
            if (this.waypointSelect && this.waypointSelect.value) {
                target = JSON.parse(this.waypointSelect.value);
            }

            if (!target) {
                this.log('Teleport aborted: no valid waypoint data is available.', 'WARN');
                this.statusNode.textContent = 'Waypoint data unavailable';
                return;
            }

            const ident = target.ident;
            const lat = Number(target.lat);
            const lon = Number(target.lon);

            if (!ident || ident === '--' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
                this.log('Teleport aborted: selected waypoint coordinate is missing.', 'WARN');
                return;
            }

            // Capture the current aircraft state so we can preserve altitude and heading intent.
            const initialLat = this.getSimVar('PLANE LATITUDE', 'degrees', lat);
            const initialLon = this.getSimVar('PLANE LONGITUDE', 'degrees', lon);
            const altitudeTarget = this.getSimVar('PLANE ALTITUDE', 'feet', 0);
            const distanceNm = this.getDistanceFromAircraftNm(initialLat, initialLon, lat, lon);
            const longDistanceTeleport = Number.isFinite(distanceNm) && distanceNm > this.longDistanceThresholdNm;
            const ambientPressureBefore = this.getSimVar('AMBIENT PRESSURE', 'inHG', Number.NaN);
            const indicatedAirspeedBefore = this.getSimVar('AIRSPEED INDICATED', 'knots', Number.NaN);

            // Large jumps can upset world-sim values, so pause briefly and re-check drift afterward.
            if (longDistanceTeleport) {
                this.pauseSimulation(true);
                this.log(`Long-distance teleport detected: ${distanceNm.toFixed(1)} NM. Pausing the simulation for ${this.longDistancePauseMs} ms to allow scenery and weather to settle.`, 'INFO');
                await this.wait(this.longDistancePauseMs);
            }

            // Apply the waypoint location while preserving the aircraft's current altitude.
            SimVar.SetSimVarValue('PLANE LATITUDE', 'degrees', lat);
            SimVar.SetSimVarValue('PLANE LONGITUDE', 'degrees', lon);
            SimVar.SetSimVarValue('PLANE ALTITUDE', 'feet', altitudeTarget);

            // Turn the aircraft to the new waypoint heading so it is aligned immediately after the jump.
            const heading = this.calculateBearingDegrees(initialLat, initialLon, lat, lon);
            SimVar.SetSimVarValue('PLANE HEADING DEGREES TRUE', 'degrees', heading);

            if (longDistanceTeleport) {
                await this.wait(250);

                const ambientPressureAfter = this.getSimVar('AMBIENT PRESSURE', 'inHG', Number.NaN);
                const indicatedAirspeedAfter = this.getSimVar('AIRSPEED INDICATED', 'knots', Number.NaN);

                // Watch for simulated environment drift after a high-distance jump before resuming.
                if (Number.isFinite(ambientPressureBefore) && Number.isFinite(ambientPressureAfter)) {
                    const pressureDelta = Math.abs(ambientPressureAfter - ambientPressureBefore);
                    if (pressureDelta > this.longDistancePressureThresholdInHg) {
                        this.log(`Pressure drift detected after long-distance teleport: ${pressureDelta.toFixed(3)} inHG. World environment changed and may be affecting altitude/flight model.`, 'WARN');
                    }
                }

                if (Number.isFinite(indicatedAirspeedBefore) && Number.isFinite(indicatedAirspeedAfter)) {
                    const airspeedDelta = Math.abs(indicatedAirspeedAfter - indicatedAirspeedBefore);
                    if (airspeedDelta > this.longDistanceAirspeedThresholdKts) {
                        SimVar.SetSimVarValue('AIRSPEED INDICATED', 'knots', indicatedAirspeedBefore);
                        this.log(`Airspeed drift corrected after long-distance teleport: ${indicatedAirspeedBefore.toFixed(1)} kt restored from ${indicatedAirspeedAfter.toFixed(1)} kt.`, 'INFO');
                    }
                }

                this.pauseSimulation(false);
            }

            this.statusNode.textContent = 'Teleported';
            this.log(`Teleported aircraft to ${ident} at ${this.formatCoordinate(lat)}, ${this.formatCoordinate(lon)} while preserving current altitude ${this.formatAltitude(altitudeTarget)} and facing ${this.formatCoordinate(heading)}° true.`, 'INFO');
        } catch (e) {
            this.log(`Teleport failed: ${e}`, 'ERROR');
        }
    }
}

window.customElements.define('my-panel', MyPanel);
checkAutoload();
