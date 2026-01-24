import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { Types } from "mongoose";

// Utility to convert snake_case string to camelCase
function snakeToCamel(str: string): string {
    if (str === "_id") {
        return "id";
    }
    return str.replace(/_([a-z])/g, (_, chr) => chr.toUpperCase());
}

// Utility to convert camelCase string to snake_case
function camelToSnake(str: string): string {
    if (str === "id") {
        return "_id";
    }
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

export function toCamelCase<T extends Record<string, any>>(record: T): any {
    if (record === null || typeof record !== 'object') {
        return record;
    }
    if (Array.isArray(record)) {
        return record.map(item => {
            if (item instanceof Types.ObjectId) {
                return item.toString();
            }
            return toCamelCase(item);
        });
    }

    const transformed: Record<string, any> = {};
    for (const [key, value] of Object.entries(record)) {
        let newValue;
        // Handle Date objects
        if (value instanceof Date && !isNaN(value.getTime())) {
            newValue = value.toISOString();
        }
        // Handle MongoDB ObjectId - convert to string
        else if (value instanceof Types.ObjectId) {
            newValue = value.toString();
        }
        // Recursively handle other objects
        else if (value && typeof value === 'object') {
            newValue = toCamelCase(value);
        } else {
            newValue = value;
        }
        transformed[snakeToCamel(key)] = newValue;
    }
    return transformed;
}

export function toSnakeCase<T extends Record<string, any>>(record: T): any {
    if (record === null || typeof record !== 'object') {
        return record;
    }
    if (Array.isArray(record)) {
        return record.map(item => {
            if (item instanceof Types.ObjectId) {
                return item.toString();
            }
            return toSnakeCase(item);
        });
    }

    const transformed: Record<string, any> = {};
    for (const [key, value] of Object.entries(record)) {
        let newValue;
        // Handle Date objects
        if (value instanceof Date && !isNaN(value.getTime())) {
            newValue = value.toISOString();
        }
        // Handle MongoDB ObjectId - convert to string
        else if (value instanceof Types.ObjectId) {
            newValue = value.toString();
        }
        // Recursively handle other objects
        else if (value && typeof value === 'object') {
            newValue = toSnakeCase(value);
        } else {
            newValue = value;
        }
        transformed[camelToSnake(key)] = newValue;
    }
    return transformed;
}

export const formatDateString = (date: Date | string, userTimezone: string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return formatInTimeZone(dateObj, userTimezone, 'yyyy-MM-dd');
};



export const normalizeDate = (date: Date | string, userTimezone: string): Date => {
    const zonedDate = toZonedTime(new Date(date), userTimezone);
    zonedDate.setHours(0, 0, 0, 0);
    return zonedDate;
};
