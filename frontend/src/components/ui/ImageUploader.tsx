'use client';

import { useState, useRef } from 'react';
import { uploadToCloudinary } from '@/lib/cloudinary';

interface ImageUploaderProps {
    value: string;
    onChange: (url: string) => void;
    shape?: 'circle' | 'square';
    placeholder?: string;
    size?: 'sm' | 'md' | 'lg';
}

export default function ImageUploader({
    value,
    onChange,
    shape = 'square',
    placeholder = '📷',
    size = 'md',
}: ImageUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const sizeClasses = {
        sm: 'w-14 h-14',
        md: 'w-20 h-20',
        lg: 'w-28 h-28',
    };

    const radiusClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl';

    const compressImage = (file: File, maxSizeMB = 8): Promise<File> =>
        new Promise((resolve) => {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                const MAX_BYTES = maxSizeMB * 1024 * 1024;
                // Calcular escala para reducir tamaño de píxeles si la imagen es muy grande
                let { width, height } = img;
                const MAX_DIM = 2400;
                if (width > MAX_DIM || height > MAX_DIM) {
                    const ratio = Math.min(MAX_DIM / width, MAX_DIM / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                // Reducir calidad hasta que quepa en maxSizeMB
                let quality = 0.85;
                const tryEncode = () => {
                    canvas.toBlob((blob) => {
                        if (!blob) { resolve(file); return; }
                        if (blob.size <= MAX_BYTES || quality <= 0.3) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                        } else {
                            quality -= 0.1;
                            tryEncode();
                        }
                    }, 'image/jpeg', quality);
                };
                tryEncode();
            };
            img.onerror = () => resolve(file);
            img.src = objectUrl;
        });

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const toUpload = file.size > 8 * 1024 * 1024 ? await compressImage(file) : file;
            const url = await uploadToCloudinary(toUpload);
            onChange(url);
        } catch (err) {
            console.error(err);
            alert('Error al subir la imagen. Intenta de nuevo.');
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="flex items-center gap-4">
            {/* Preview */}
            <div
                className={`${sizeClasses[size]} ${radiusClass} shrink-0 bg-muted/20 border-2 border-dashed border-muted/40 flex items-center justify-center overflow-hidden relative`}
            >
                {value ? (
                    <img src={value} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                    <span className="text-2xl opacity-40">{placeholder}</span>
                )}
                {uploading && (
                    <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
                <label className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition text-center border ${uploading ? 'bg-muted/10 text-muted-foreground border-muted/20 pointer-events-none opacity-50' : 'bg-muted/10 hover:bg-muted/20 text-foreground border-muted/30'}`}>
                    {uploading ? 'Subiendo...' : value ? 'Cambiar imagen' : 'Subir imagen'}
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFile}
                        disabled={uploading}
                    />
                </label>
                {value && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="px-4 py-2 text-xs font-bold text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition text-center border border-transparent hover:border-red-500/20"
                    >
                        Eliminar
                    </button>
                )}
            </div>
        </div>
    );
}
