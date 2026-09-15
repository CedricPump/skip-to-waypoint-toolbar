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

    function geodesicDestinationCoordinates(lat, lon, bearingDegrees, distanceNm) {
        if (!Number.isFinite(lat) || !Number.isFinite(lon)
            || !Number.isFinite(bearingDegrees) || !Number.isFinite(distanceNm)) {
            return { lat: Number.NaN, lon: Number.NaN };
        }

        var earthRadiusNm = 3440.065;
        var angularDistance = distanceNm / earthRadiusNm;
        var φ1 = toRadians(lat);
        var λ1 = toRadians(lon);
        var θ = toRadians(bearingDegrees);
        var sinφ1 = Math.sin(φ1);
        var cosφ1 = Math.cos(φ1);
        var sinAngularDistance = Math.sin(angularDistance);
        var cosAngularDistance = Math.cos(angularDistance);
        var sinφ2 = sinφ1 * cosAngularDistance + cosφ1 * sinAngularDistance * Math.cos(θ);
        var φ2 = Math.asin(sinφ2);
        var y = Math.sin(θ) * sinAngularDistance * cosφ1;
        var x = cosAngularDistance - sinφ1 * Math.sin(φ2);
        var λ2 = λ1 + Math.atan2(y, x);

        return {
            lat: toDegrees(φ2),
            lon: normalizeDegrees(toDegrees(λ2) + 180) - 180
        };
    }

    root.GeoMath = {
        toRadians: toRadians,
        toDegrees: toDegrees,
        normalizeDegrees: normalizeDegrees,
        geodesicDistanceNm: geodesicDistanceNm,
        geodesicBearingDegrees: geodesicBearingDegrees,
        geodesicDestinationCoordinates: geodesicDestinationCoordinates,
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
        this.flightplanFixes = [];
        this.activeFlightplanFixIndex = 0;
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
            this.identNode = this.querySelector('#next-fix-ident');
            this.typeNode = this.querySelector('#next-fix-type');
            this.nextLatNode = this.querySelector('#next-fix-lat');
            this.nextLonNode = this.querySelector('#next-fix-lon');
            this.nextDistanceNode = this.querySelector('#next-fix-distance');
            this.nextHeadingNode = this.querySelector('#next-fix-heading');
            this.selectLatNode = this.querySelector('#select-fix-lat');
            this.selectLonNode = this.querySelector('#select-fix-lon');

            // Wire up the action buttons and dropdown to panel behavior.
            this.btnTeleport = this.querySelector('#btnTeleport');
            this.btnRefresh = this.querySelector('#btnRefresh');
            this.waypointSelect = this.querySelector('#waypoint-select');
            this.manualWaypointInput = this.querySelector('#manual-waypoint-input');
            this.btnLookup = this.querySelector('#btnLookup');
            this.setFuelOnTeleport = this.querySelector('#set-fuel-on-teleport');
            this.teleportBeforeFix = this.querySelector('#teleport-before-fix');
            this.autoUpdate = this.querySelector('#auto-update');

            if (this.manualWaypointInput) {
                try {
                    const config = window.SkipToWaypointConfig || {};
                    this.manualWaypointInput.value = config.simBriefUser || '';
                } catch (e) {
                    this.log(`Unable to read SimBrief config: ${e && e.message ? e.message : e}`, 'WARN');
                }
            }

            if (this.btnTeleport) this.btnTeleport.addEventListener('click', () => this.onTeleportClicked());
            if (this.btnRefresh) this.btnRefresh.addEventListener('click', () => this.refreshWaypointState());
            if (this.waypointSelect) this.waypointSelect.addEventListener('OnValidate', () => this.onWaypointSelected());
            if (this.btnLookup) this.btnLookup.addEventListener('click', () => this.onLookupClicked());
            if (this.autoUpdate) this.autoUpdate.addEventListener('change', () => this.onAutoUpdateChanged());

            this.refreshIntervalMs = 60000;
            this.refreshTimer = null;
            this.started = true;
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

    onAutoUpdateChanged() {
        if (this.autoUpdate && this.autoUpdate.checked) {
            this.startAutoRefresh();
            this.log('Auto-update enabled: refreshing every 60 seconds.', 'INFO');
        } else {
            this.stopAutoRefresh();
            this.log('Auto-update disabled.', 'INFO');
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

        if (!geoMath || typeof geoMath.geodesicBearingDegrees !== 'function' || typeof geoMath.geodesicDistanceNm !== 'function' || typeof geoMath.geodesicDestinationCoordinates !== 'function' || typeof geoMath.toRadians !== 'function') {
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

    calculateDestinationCoordinates(lat, lon, bearingDegrees, distanceNm) {
        const geoMath = this.getGeoMath();
        if (!geoMath) return { lat: Number.NaN, lon: Number.NaN };
        return geoMath.geodesicDestinationCoordinates(lat, lon, bearingDegrees, distanceNm);
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

    getBearingFromAircraftToWaypoint(waypoint) {
        const currentLat = this.getSimVar('PLANE LATITUDE', 'degrees', Number.NaN);
        const currentLon = this.getSimVar('PLANE LONGITUDE', 'degrees', Number.NaN);
        if (!Number.isFinite(currentLat) || !Number.isFinite(currentLon)) return Number.NaN;
        return this.calculateBearingDegrees(currentLat, currentLon, Number(waypoint.lat), Number(waypoint.lon));
    }

    getHeadingDifferenceDegrees(firstHeading, secondHeading) {
        const difference = Math.abs(firstHeading - secondHeading) % 360;
        return difference > 180 ? 360 - difference : difference;
    }

    selectInitialFlightplanFix() {
        if (!this.flightplanFixes.length) return;

        const currentLat = this.getSimVar('PLANE LATITUDE', 'degrees', Number.NaN);
        const currentLon = this.getSimVar('PLANE LONGITUDE', 'degrees', Number.NaN);
        const currentHeading = this.getSimVar('PLANE HEADING DEGREES TRUE', 'degrees', Number.NaN);
        if (!Number.isFinite(currentLat) || !Number.isFinite(currentLon) || !Number.isFinite(currentHeading)) {
            this.activeFlightplanFixIndex = 0;
            return;
        }

        let closestForwardIndex = 0;
        let closestForwardDistance = Number.POSITIVE_INFINITY;
        this.flightplanFixes.forEach((fix, index) => {
            const distance = this.getDistanceFromAircraftNm(currentLat, currentLon, fix.lat, fix.lon);
            const bearing = this.calculateBearingDegrees(currentLat, currentLon, fix.lat, fix.lon);
            const headingDifference = this.getHeadingDifferenceDegrees(currentHeading, bearing);
            if (Number.isFinite(distance) && Number.isFinite(bearing) && headingDifference <= 90 && distance < closestForwardDistance) {
                closestForwardIndex = index;
                closestForwardDistance = distance;
            }
        });

        this.activeFlightplanFixIndex = closestForwardDistance < Number.POSITIVE_INFINITY ? closestForwardIndex : 0;
        this.log(`Initial active flightplan fix: ${this.flightplanFixes[this.activeFlightplanFixIndex].ident}`, 'INFO');
    }

    reconcileActiveFlightplanFix() {
        if (!this.flightplanFixes.length) return;

        const currentLat = this.getSimVar('PLANE LATITUDE', 'degrees', Number.NaN);
        const currentLon = this.getSimVar('PLANE LONGITUDE', 'degrees', Number.NaN);
        const currentHeading = this.getSimVar('PLANE HEADING DEGREES TRUE', 'degrees', Number.NaN);
        if (!Number.isFinite(currentLat) || !Number.isFinite(currentLon) || !Number.isFinite(currentHeading)) return;

        const activeFix = this.flightplanFixes[this.activeFlightplanFixIndex];
        const activeBearing = this.calculateBearingDegrees(currentLat, currentLon, activeFix.lat, activeFix.lon);
        if (Number.isFinite(activeBearing) && this.getHeadingDifferenceDegrees(currentHeading, activeBearing) <= 90) return;

        const maxFixesToCheck = 5;
        const lastIndexToCheck = Math.min(this.activeFlightplanFixIndex + maxFixesToCheck, this.flightplanFixes.length - 1);
        for (let index = this.activeFlightplanFixIndex + 1; index <= lastIndexToCheck; index += 1) {
            const fix = this.flightplanFixes[index];
            const bearing = this.calculateBearingDegrees(currentLat, currentLon, fix.lat, fix.lon);
            if (Number.isFinite(bearing) && this.getHeadingDifferenceDegrees(currentHeading, bearing) <= 90) {
                this.activeFlightplanFixIndex = index;
                this.log(`Reconciled active flightplan fix: ${fix.ident}`, 'INFO');
                return;
            }
        }
    }

    getWaypointEntries() {
        if (this.flightplanFixes.length) {
            this.reconcileActiveFlightplanFix();
            return [this.flightplanFixes[this.activeFlightplanFixIndex]];
        }

        return [];
    }

    onWaypointSelected() {
        if (!this.waypointSelect) return;
        const selectedValue = this.waypointSelect.metadata;
        if (!selectedValue) return;

        try {
            const selected = JSON.parse(selectedValue);
            this.selectLatNode.textContent = this.formatCoordinate(selected.lat);
            this.selectLonNode.textContent = this.formatCoordinate(selected.lon);
                if (this.waypointSelect && Number.isInteger(selected.routeIndex)) {
                    this.waypointSelect.title = `SELECT FIX #${String(selected.routeIndex + 1).padStart(2, '0')}`;
                }
            this.statusNode.textContent = 'Route fix selected';
        } catch (e) {
            this.log(`Failed to parse selected waypoint: ${e}`, 'WARN');
        }
    }

    async onLookupClicked() {
        const text = this.manualWaypointInput ? this.manualWaypointInput.value : '';
        const trimmedText = text.trim();

        const queryName = /^\d+$/.test(trimmedText) ? 'userid' : 'username';
        const url = `https://www.simbrief.com/api/xml.fetcher.php?${queryName}=${encodeURIComponent(trimmedText)}&json=1`;

        try {
            const response = await fetch(url);
            const flightplan = await response.json();
            const origin = flightplan.origin && flightplan.origin.icao_code;
            const destination = flightplan.destination && flightplan.destination.icao_code;
            this.log(`Flightplan: ${origin || '--'} - ${destination || '--'}`, 'INFO');

            const fixes = flightplan.navlog && Array.isArray(flightplan.navlog.fix)
                ? flightplan.navlog.fix
                : [];
            this.flightplanFixes = fixes.map((fix, index) => ({
                ident: fix && fix.ident ? fix.ident : '--',
                type: fix && fix.type ? fix.type : 'WAYPOINT',
                lat: Number(fix && fix.pos_lat),
                lon: Number(fix && fix.pos_long),
                alt: Number(fix && fix.altitude) || 0,
                fuelPlanOnboardKg: Number(fix && fix.fuel_plan_onboard),
                routeIndex: index
            })).filter((fix) => Number.isFinite(fix.lat) && Number.isFinite(fix.lon));
            this.activeFlightplanFixIndex = 0;
            this.selectInitialFlightplanFix();

            fixes.forEach((fix, index) => {
                const ident = fix && fix.ident ? fix.ident : '--';
                const latitude = fix && fix.pos_lat !== undefined ? fix.pos_lat : '--';
                const longitude = fix && fix.pos_long !== undefined ? fix.pos_long : '--';
                this.log(`Waypoint ${index + 1}: ${ident} (${latitude}, ${longitude})`, 'INFO');
            });
        } catch (e) {
            this.log(`Flightplan request failed: ${e && e.message ? e.message : e}`, 'ERROR');
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
                this.nextLatNode.textContent = '--';
                this.nextLonNode.textContent = '--';
                this.nextDistanceNode.textContent = '--';
                this.nextHeadingNode.textContent = '--';
                this.selectLatNode.textContent = '--';
                this.selectLonNode.textContent = '--';
                if (this.waypointSelect) {
                    this.waypointSelect.SetData({
                        daChoices: ['No waypoint data'],
                        daMetadatas: [''],
                        iDefault: 0,
                        bLoop: false,
                        bDisabled: true,
                        bHideButtons: true,
                        sTitle: 'SELECT FIX #00',
                        sEmpty: ''
                    });
                }
                this.log('No valid next waypoint data is available.', 'INFO');
                return;
            }

            const selected = entries[0];

            if (this.waypointSelect) {
                const upcomingFixes = this.flightplanFixes.length
                    ? this.flightplanFixes.slice(this.activeFlightplanFixIndex)
                    : [selected];
                this.waypointSelect.SetData({
                    daChoices: upcomingFixes.map((fix) => `${fix.ident} (${String(fix.type || 'WAYPOINT').toUpperCase()})`),
                    daMetadatas: upcomingFixes.map((fix) => JSON.stringify(fix)),
                    iDefault: 0,
                    bLoop: false,
                    bDisabled: false,
                    bHideButtons: false,
                    sTitle: `SELECT FIX #${String(this.activeFlightplanFixIndex + 1).padStart(2, '0')}`,
                    sEmpty: ''
                });
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
            this.nextLatNode.textContent = this.formatCoordinate(selected.lat);
            this.nextLonNode.textContent = this.formatCoordinate(selected.lon);
            this.nextDistanceNode.textContent = Number.isFinite(waypointDistanceNm) ? `${waypointDistanceNm.toFixed(1)} NM` : '--';
            const heading = this.getBearingFromAircraftToWaypoint(selected);
            this.nextHeadingNode.textContent = Number.isFinite(heading) ? `${heading.toFixed(0)}°` : '--';
            if (this.selectLatNode && this.selectLonNode) {
                this.selectLatNode.textContent = this.formatCoordinate(selected.lat);
                this.selectLonNode.textContent = this.formatCoordinate(selected.lon);
            }

            this.log(`Waypoint ready: ${selected.ident}. Distance to waypoint: ${Number.isFinite(waypointDistanceNm) ? waypointDistanceNm.toFixed(1) : '--'} NM.`);
        } catch (e) {
            this.log(`Error reading waypoint state: ${e}`, 'ERROR');
        }
    }

    async onTeleportClicked() {
        try {
            // Read the currently selected route fix and reject the action if it is invalid.
            let target = null;
            if (this.waypointSelect && this.waypointSelect.metadata) {
                target = JSON.parse(this.waypointSelect.metadata);
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
            const approachBearing = this.calculateBearingDegrees(initialLat, initialLon, lat, lon);
            let teleportLat = lat;
            let teleportLon = lon;

            if (this.teleportBeforeFix && this.teleportBeforeFix.checked) {
                const groundSpeedKts = this.getSimVar(
                    'GROUND VELOCITY',
                    'knots',
                    this.getSimVar('GPS GROUND SPEED', 'knots', Number.NaN)
                );
                const leadDistanceNm = Number.isFinite(groundSpeedKts)
                    ? Math.max(0, groundSpeedKts) * 15 / 3600
                    : Number.NaN;
                const leadPosition = this.calculateDestinationCoordinates(
                    lat,
                    lon,
                    approachBearing + 180,
                    leadDistanceNm
                );

                if (Number.isFinite(leadPosition.lat) && Number.isFinite(leadPosition.lon)) {
                    teleportLat = leadPosition.lat;
                    teleportLon = leadPosition.lon;
                    this.log(`Experimental lead teleport: ${groundSpeedKts.toFixed(1)} kt, ${leadDistanceNm.toFixed(2)} NM before ${ident} at ${this.formatCoordinate(teleportLat)}, ${this.formatCoordinate(teleportLon)}.`, 'WARN');
                } else {
                    this.log(`Experimental lead teleport skipped: ground speed unavailable for ${ident}.`, 'WARN');
                }
            }

            const distanceNm = this.getDistanceFromAircraftNm(initialLat, initialLon, teleportLat, teleportLon);
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
            SimVar.SetSimVarValue('PLANE LATITUDE', 'degrees', teleportLat);
            SimVar.SetSimVarValue('PLANE LONGITUDE', 'degrees', teleportLon);
            SimVar.SetSimVarValue('PLANE ALTITUDE', 'feet', altitudeTarget);

            // Turn the aircraft to the new waypoint heading so it is aligned immediately after the jump.
            const heading = approachBearing;
            SimVar.SetSimVarValue('PLANE HEADING DEGREES TRUE', 'degrees', heading);

            if (this.setFuelOnTeleport && this.setFuelOnTeleport.checked) {
                const fuelPlanOnboardKg = Number(target.fuelPlanOnboardKg);
                if (Number.isFinite(fuelPlanOnboardKg) && fuelPlanOnboardKg >= 0) {
                    const fuelPlanOnboardLb = fuelPlanOnboardKg * 2.2046226218;
                    try {
                        SimVar.SetSimVarValue('FUEL TOTAL QUANTITY WEIGHT', 'pounds', fuelPlanOnboardLb);
                        this.log(`Experimental fuel set: ${fuelPlanOnboardKg.toFixed(1)} kg (${fuelPlanOnboardLb.toFixed(1)} lb) at ${ident}.`, 'WARN');
                    } catch (e) {
                        this.log(`Experimental fuel write failed at ${ident}: ${e && e.message ? e.message : e}`, 'ERROR');
                    }
                } else {
                    this.log(`Experimental fuel skipped: no valid SimBrief fuel estimate for ${ident}.`, 'WARN');
                }
            }

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
            this.log(`Teleported aircraft to ${ident} at ${this.formatCoordinate(teleportLat)}, ${this.formatCoordinate(teleportLon)} while preserving current altitude ${this.formatAltitude(altitudeTarget)} and facing ${this.formatCoordinate(heading)}° true.`, 'INFO');
        } catch (e) {
            this.log(`Teleport failed: ${e}`, 'ERROR');
        }
    }
}

window.customElements.define('my-panel', MyPanel);
checkAutoload();
