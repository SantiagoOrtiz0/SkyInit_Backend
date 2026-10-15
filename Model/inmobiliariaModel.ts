import { db } from "./conexion.ts";
import { inmobiliarias, usuarios, roles } from "./schema.ts";
import { eq, sql } from "../Dependencies/dependencias.ts";

// ──────────────────────────────────────────────
// LISTAR todas las inmobiliarias + usuarios asignados
// ──────────────────────────────────────────────
export async function listarInmobiliariasAdmin() {
    const filas = await db
        .select({
            inmobiliariaID: inmobiliarias.inmobiliariaID,
            nombre: inmobiliarias.nombre,
            contacto: inmobiliarias.contacto,
            telefono: inmobiliarias.telefono,
            correo: inmobiliarias.correo,
            estado: inmobiliarias.estado,
            logo: inmobiliarias.logo,
            descripcion: inmobiliarias.descripcion,
            ciudad: inmobiliarias.ciudad,
            fechaRegistro: inmobiliarias.fechaRegistro,
            // usuario asignado
            usuarioID: usuarios.usuarioID,
            usuarioNombre: usuarios.nombre,
            usuarioCorreo: usuarios.correo,
            usuarioRolID: usuarios.rolID,
            usuarioRolNombre: roles.nombreRol,
        })
        .from(inmobiliarias)
        .leftJoin(usuarios, eq(usuarios.inmobiliariaID, inmobiliarias.inmobiliariaID))
        .leftJoin(roles, eq(usuarios.rolID, roles.rolID));

    // Agrupar: 1 inmobiliaria → N usuarios asignados
    const mapa = new Map<number, any>();
    for (const f of filas) {
        if (!mapa.has(f.inmobiliariaID)) {
            mapa.set(f.inmobiliariaID, {
                inmobiliariaID: f.inmobiliariaID,
                nombre: f.nombre,
                contacto: f.contacto,
                telefono: f.telefono,
                correo: f.correo,
                estado: f.estado,
                logo: f.logo,
                descripcion: f.descripcion,
                ciudad: f.ciudad,
                fechaRegistro: f.fechaRegistro,
                usuariosAsignados: [],
            });
        }
        if (f.usuarioID) {
            mapa.get(f.inmobiliariaID).usuariosAsignados.push({
                usuarioID: f.usuarioID,
                nombre: f.usuarioNombre,
                correo: f.usuarioCorreo,
                rolID: f.usuarioRolID,
                nombreRol: f.usuarioRolNombre,
            });
        }
    }
    return Array.from(mapa.values());
}

// ──────────────────────────────────────────────
// CREAR inmobiliaria
// ──────────────────────────────────────────────
export async function crearInmobiliaria(data: {
    nombre: string;
    contacto?: string | null;
    telefono?: string | null;
    correo?: string | null;
    estado?: string;
    descripcion?: string | null;
    ciudad?: string | null;
}): Promise<number> {
    const [resultado] = await db.insert(inmobiliarias).values({
        nombre: data.nombre,
        contacto: data.contacto ?? null,
        telefono: data.telefono ?? null,
        correo: data.correo ?? null,
        estado: data.estado ?? "Activa",
        descripcion: data.descripcion ?? null,
        ciudad: data.ciudad ?? null,
    });
    return Number((resultado as any).insertId ?? 0);
}

// ──────────────────────────────────────────────
// ACTUALIZAR inmobiliaria
// ──────────────────────────────────────────────
export async function actualizarInmobiliaria(
    id: number,
    data: Partial<{
        nombre: string;
        contacto: string | null;
        telefono: string | null;
        correo: string | null;
        estado: string;
        descripcion: string | null;
        ciudad: string | null;
    }>
) {
    await db
        .update(inmobiliarias)
        .set(data)
        .where(eq(inmobiliarias.inmobiliariaID, id));
}

// ──────────────────────────────────────────────
// ASIGNAR usuario a inmobiliaria
//   Actualiza inmobiliariaID en la tabla usuarios
// ──────────────────────────────────────────────
export async function asignarUsuarioInmobiliaria(
    usuarioID: number,
    inmobiliariaID: number | null
) {
    await db
        .update(usuarios)
        .set({ inmobiliariaID })
        .where(eq(usuarios.usuarioID, usuarioID));
}

// ──────────────────────────────────────────────
// Verificar si la inmobiliaria existe
// ──────────────────────────────────────────────
export async function inmobiliariaExiste(id: number): Promise<boolean> {
    const [row] = await db
        .select({ inmobiliariaID: inmobiliarias.inmobiliariaID })
        .from(inmobiliarias)
        .where(eq(inmobiliarias.inmobiliariaID, id));
    return !!row;
}

// ──────────────────────────────────────────────
// Listar usuarios disponibles para asignar
//   (sin inmobiliaria o con la misma)
// ──────────────────────────────────────────────
export async function listarUsuariosParaAsignar(inmobiliariaID?: number) {
    const filas = await db
        .select({
            usuarioID: usuarios.usuarioID,
            nombre: usuarios.nombre,
            correo: usuarios.correo,
            rolID: usuarios.rolID,
            nombreRol: roles.nombreRol,
            inmobiliariaID: usuarios.inmobiliariaID,
        })
        .from(usuarios)
        .leftJoin(roles, eq(usuarios.rolID, roles.rolID));

    // Devolver usuarios sin inmobiliaria + los ya asignados a esta
    return filas.filter(
        (u) =>
            u.inmobiliariaID === null ||
            (inmobiliariaID && u.inmobiliariaID === inmobiliariaID)
    );
}
