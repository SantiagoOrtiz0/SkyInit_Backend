const CARPETA_BASE = "./uploads";
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5MB

export interface ArchivoSubido {
    ok: boolean;
    url?: string;
    error?: string;
}

export async function guardarImagen(
    archivo: File | null,
    subcarpeta: "constructoras" | "proyectos" | "perfiles" | "usuarios" | "propiedades" | "servicios",
): Promise<ArchivoSubido> {
    if (!archivo) {
        return { ok: false, error: "No se recibio ningun archivo" };
    }

    if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
        return { ok: false, error: "Formato de imagen no soportado (usa jpg, png o webp)" };
    }

    if (archivo.size > TAMANO_MAXIMO) {
        return { ok: false, error: "La imagen no debe superar los 5MB" };
    }

    const bytes = new Uint8Array(await archivo.arrayBuffer());

    // No confiar en el tipo que declara el cliente: se revisa la firma real del archivo
    const tipoReal = detectarTipoImagen(bytes);
    if (!tipoReal) {
        return { ok: false, error: "El archivo no es una imagen valida (usa jpg, png o webp)" };
    }
    const extension = tipoReal;
    const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
    const carpetaDestino = `${CARPETA_BASE}/${subcarpeta}`;

    await Deno.mkdir(carpetaDestino, { recursive: true });

    await Deno.writeFile(`${carpetaDestino}/${nombreArchivo}`, bytes);

    return { ok: true, url: `/uploads/${subcarpeta}/${nombreArchivo}` };
}

function detectarTipoImagen(b: Uint8Array): "jpg" | "png" | "webp" | null {
    if (b.length < 12) return null;
    if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
    if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
    if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
        b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "webp";
    return null;
}

/** Elimina una imagen del disco a partir de su URL relativa guardada en BD */
export async function eliminarImagenDisco(url: string | null | undefined): Promise<void> {
    if (!url || !url.startsWith("/uploads/") || url.includes("..")) return;
    try {
        await Deno.remove(`.${url}`);
    } catch {
    }
}