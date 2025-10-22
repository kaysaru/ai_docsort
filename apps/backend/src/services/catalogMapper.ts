/**
 * Maps document types to catalog codes
 */
export function mapDocumentTypeToCatalog(documentType: string): string {
    const mapping: Record<string, string> = {
        'passport': 'passports',
        'driver_license': 'licenses',
        'id_card': 'personal',
        'birth_certificate': 'personal',
        'diploma': 'personal',
        'certificate': 'business',
        'unknown': 'personal', // Default fallback
    };

    return mapping[documentType] || 'personal';
}

/**
 * Get user-friendly catalog name
 */
export function getCatalogDisplayName(catalogCode: string): string {
    const names: Record<string, string> = {
        'passports': 'Passports',
        'licenses': 'Driver Licenses',
        'personal': 'Personal Documents',
        'business': 'Business Documents',
    };

    return names[catalogCode] || catalogCode;
}
