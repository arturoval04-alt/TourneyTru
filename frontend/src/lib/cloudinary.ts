const CLOUD_NAME = 'dgj8q1ftq';
const UPLOAD_PRESET = 'wdbu8ve0';

export async function uploadToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        const errBody = await response.json().catch(() => ({}));
        throw new Error(`Error Cloudinary ${response.status}: ${errBody?.error?.message ?? response.statusText}`);
    }

    const data = await response.json();
    return data.secure_url as string;
}

/** Sube un PDF u otro archivo (raw) a Cloudinary y retorna la URL segura */
export async function uploadFileToCloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', UPLOAD_PRESET);

    const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`,
        { method: 'POST', body: formData }
    );

    if (!response.ok) {
        throw new Error('Error al subir archivo a Cloudinary');
    }

    const data = await response.json();
    return data.secure_url as string;
}
