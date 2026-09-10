class MyPanel extends TemplateElement {
    constructor() {
        super(...arguments);
        this.debugEnabled = true;
        this.version = "v1.1.0";
        this.initialize();
    }

    connectedCallback() {
        super.connectedCallback();
        this.initialize();
    }

    initialize() {
        if (this.started) return;
        try {
            this.ingameUi = this.querySelector("ingame-ui");

            this.txtDebugLog = this.querySelector('#txt-debug-log');
            this.txtDebugLogLabel = this.querySelector('#debug-log-label');
            this.statusNode = this.querySelector('#flightplan-status');
            this.identNode = this.querySelector('#next-waypoint-ident');
            this.typeNode = this.querySelector('#next-waypoint-type');
            this.latNode = this.querySelector('#next-waypoint-lat');
            this.lonNode = this.querySelector('#next-waypoint-lon');
            this.altNode = this.querySelector('#next-waypoint-alt');

            this.btnTeleport = this.querySelector('#btnTeleport');
            this.btnRefresh = this.querySelector('#btnRefresh');
            this.waypointSelect = this.querySelector('#waypoint-select');

            if (this.btnTeleport) this.btnTeleport.addEventListener('click', () => this.onTeleportClicked());
            if (this.btnRefresh) this.btnRefresh.addEventListener('click', () => this.refreshWaypointState());
            if (this.waypointSelect) this.waypointSelect.addEventListener('change', () => this.onWaypointSelected());

            this.started = true;
            this.refreshWaypointState();
        } catch (e) {
            this.log(`Error in initialize: ${e}`, 'ERROR');
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

    calculateBearingDegrees(startLat, startLon, endLat, endLon) {
        const lat1 = this.toRadians(startLat);
        const lat2 = this.toRadians(endLat);
        const dLon = this.toRadians(endLon - startLon);

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        let angle = Math.atan2(y, x) * 180 / Math.PI;

        angle = (angle + 360) % 360;
        return angle;
    }

    toRadians(value) {
        return value * Math.PI / 180;
    }

    getWaypointEntries() {
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
            this.altNode.textContent = this.formatAltitude(selected.alt);
            this.statusNode.textContent = 'Route fix selected';
        } catch (e) {
            this.log(`Failed to parse selected waypoint: ${e}`, 'WARN');
        }
    }

    refreshWaypointState() {
        try {
            this.log('Refreshing waypoint state... ', 'DEBUG');
            const entries = this.getWaypointEntries();

            if (entries.length === 0) {
                this.statusNode.textContent = 'Waypoint data unavailable';
                this.identNode.textContent = 'N/A';
                this.typeNode.textContent = 'Unavailable';
                this.latNode.textContent = '--';
                this.lonNode.textContent = '--';
                this.altNode.textContent = '--';
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

            this.statusNode.textContent = 'Waypoint available';
            this.identNode.textContent = selected.ident;
            this.typeNode.textContent = String(selected.type || 'WAYPOINT').toUpperCase();
            this.latNode.textContent = this.formatCoordinate(selected.lat);
            this.lonNode.textContent = this.formatCoordinate(selected.lon);
            this.altNode.textContent = this.formatAltitude(selected.alt);

            this.log(`Waypoint ready: ${selected.ident}.`);
        } catch (e) {
            this.log(`Error reading waypoint state: ${e}`, 'ERROR');
        }
    }

    onTeleportClicked() {
        try {
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
            const alt = Number(target.alt);

            if (!ident || ident === '--' || !Number.isFinite(lat) || !Number.isFinite(lon)) {
                this.log('Teleport aborted: selected waypoint coordinate is missing.', 'WARN');
                return;
            }

            const initialLat = this.getSimVar('PLANE LATITUDE', 'degrees', lat);
            const initialLon = this.getSimVar('PLANE LONGITUDE', 'degrees', lon);
            const altitudeTarget = this.getSimVar('PLANE ALTITUDE', 'feet', 0);

            SimVar.SetSimVarValue('PLANE LATITUDE', 'degrees', lat);
            SimVar.SetSimVarValue('PLANE LONGITUDE', 'degrees', lon);
            SimVar.SetSimVarValue('PLANE ALTITUDE', 'feet', altitudeTarget);

            const heading = this.calculateBearingDegrees(initialLat, initialLon, lat, lon);
            SimVar.SetSimVarValue('PLANE HEADING DEGREES TRUE', 'degrees', heading);

            this.statusNode.textContent = 'Teleported';
            this.log(`Teleported aircraft to ${ident} at ${this.formatCoordinate(lat)}, ${this.formatCoordinate(lon)} while preserving current altitude ${this.formatAltitude(altitudeTarget)} and facing ${this.formatCoordinate(heading)}° true.`, 'INFO');
        } catch (e) {
            this.log(`Teleport failed: ${e}`, 'ERROR');
        }
    }
}

window.customElements.define('my-panel', MyPanel);
checkAutoload();
