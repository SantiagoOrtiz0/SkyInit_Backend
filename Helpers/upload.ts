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
    subcarpeta: "constructoras" | "proyectos" | "perfiles",
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

    const extension = archivo.type === "image/png" ? "png" : archivo.type === "image/webp" ? "webp" : "jpg";
    const nombreArchivo = `${crypto.randomUUID()}.${extension}`;
    const carpetaDestino = `${CARPETA_BASE}/${subcarpeta}`;

    await Deno.mkdir(carpetaDestino, { recursive: true });

    const bytes = new Uint8Array(await archivo.arrayBuffer());
    await Deno.writeFile(`${carpetaDestino}/${nombreArchivo}`, bytes);

    return { ok: true, url: `/uploads/${subcarpeta}/${nombreArchivo}` };
}

/** Elimina una imagen del disco a partir de su URL relativa guardada en BD */
export async function eliminarImagenDisco(url: string | null | undefined): Promise<void> {
    if (!url || !url.startsWith("/uploads/")) return;
    try {
        await Deno.remove(`.${url}`);
    } catch {
    }
}
