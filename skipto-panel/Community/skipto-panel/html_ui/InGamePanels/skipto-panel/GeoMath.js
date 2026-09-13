(function (global) {
    'use strict';

    const WGS84 = {
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
        const degrees = value % 360;
        return degrees < 0 ? degrees + 360 : degrees;
    }

    function haversineDistanceNm(lat1, lon1, lat2, lon2) {
        const earthRadiusNm = 3440.065;
        const φ1 = toRadians(lat1);
        const φ2 = toRadians(lat2);
        const Δφ = toRadians(lat2 - lat1);
        const Δλ = toRadians(lon2 - lon1);

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2)
            + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return earthRadiusNm * c;
    }

    function vincentyDistanceMeters(lat1, lon1, lat2, lon2) {
        const a = WGS84.semiMajorAxisMeters;
        const b = WGS84.semiMinorAxisMeters;
        const f = WGS84.flattening;

        const φ1 = toRadians(lat1);
        const φ2 = toRadians(lat2);
        const L = toRadians(lon2 - lon1);

        let U1 = Math.atan((1 - f) * Math.tan(φ1));
        let U2 = Math.atan((1 - f) * Math.tan(φ2));
        let sinU1 = Math.sin(U1);
        let cosU1 = Math.cos(U1);
        let sinU2 = Math.sin(U2);
        let cosU2 = Math.cos(U2);

        let sinSigma = 0;
        let cosSigma = 0;
        let sigma = 0;
        let sinAlpha = 0;
        let cosSqAlpha = 0;
        let cos2SigmaM = 0;

        let lambda = L;
        let lambdaPrev = 0;
        const maxIterations = 200;

        for (let iteration = 0; iteration < maxIterations; iteration += 1) {
            const sinLambda = Math.sin(lambda);
            const cosLambda = Math.cos(lambda);

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

            const C = (f / 16) * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
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

        const uSq = cosSqAlpha * ((a * a) - (b * b)) / (b * b);
        const A = 1 + (uSq / 16384) * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
        const B = (uSq / 1024) * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
        const deltaSigma = B * sinSigma * (
            cos2SigmaM + (B / 4) * (
                cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)
                - (B / 6) * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)
            )
        );

        const meters = b * A * (sigma - deltaSigma);
        return meters;
    }

    function geodesicDistanceNm(lat1, lon1, lat2, lon2) {
        if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
            return Number.NaN;
        }

        const distanceMeters = vincentyDistanceMeters(lat1, lon1, lat2, lon2);
        if (Number.isFinite(distanceMeters)) {
            return distanceMeters / 1852.0;
        }

        return haversineDistanceNm(lat1, lon1, lat2, lon2);
    }

    function geodesicBearingDegrees(lat1, lon1, lat2, lon2) {
        if (!Number.isFinite(lat1) || !Number.isFinite(lon1) || !Number.isFinite(lat2) || !Number.isFinite(lon2)) {
            return Number.NaN;
        }

        const φ1 = toRadians(lat1);
        const φ2 = toRadians(lat2);
        const λ = toRadians(lon2 - lon1);

        const y = Math.sin(λ) * Math.cos(φ2);
        const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(λ);
        const bearing = Math.atan2(y, x);
        return normalizeDegrees(toDegrees(bearing));
    }

    const geoMath = {
        toRadians,
        toDegrees,
        normalizeDegrees,
        geodesicDistanceNm,
        geodesicBearingDegrees,
        haversineDistanceNm
    };

    const root = (typeof window !== 'undefined' && window)
        || (typeof self !== 'undefined' && self)
        || (typeof global !== 'undefined' && global)
        || this;

    if (root) {
        root.GeoMath = geoMath;
    }
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : this));
