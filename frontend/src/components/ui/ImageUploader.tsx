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

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const url = await uploadToCloudinary(file);
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
