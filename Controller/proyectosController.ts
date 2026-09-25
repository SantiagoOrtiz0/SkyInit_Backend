import {Context} from "../Dependencies/dependencias.ts";
import {Proyecto} from "../Model/proyectosModel.ts";

// Listar proyectos con filtros (Publica)
export const listarProyectos = async (ctx:Context) => {
    try {
        const params = ctx.request.url.searchParams;
        const modeloProyecto = new Proyecto();
        const proyectos = await modeloProyecto.SeleccionarProyectos({
            estadoProyectoID: params.get("estadoProyectoID") ? Number(params.get("estadoProyectoID")) : undefined,
            constructoraID: params.get("constructoraID") ? Number(params.get("constructoraID")) : undefined,
            ubicacion: params.get("ubicacion") ?? undefined,
            orden: (params.get("orden") as "avance_asc" | "avance_desc" | "fecha") ?? undefined,
        });

        ctx.response.status = 200;
        ctx.response.body = proyectos;
    } catch (error) {
        console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al listar los proyectos"};
    }
};

    // Listar proyectos de una constructora (Publica)
    export const listarPorConstructora = async (ctx:any) => {
        try {
            const {constructoraID} = ctx.params;
            const modeloProyecto = new Proyecto();
            const proyectos = await modeloProyecto.SeleccionarPorConstructora(Number(constructoraID));

            ctx.response.status = 200;
            ctx.response.body = proyectos;
        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al listar los proyectos de la constructora"};
        }
    };

    // Consultar proyecto por id (Publica)
    export const consultarProyecto = async (ctx:any) => {
        try {
            const {id} = ctx.params;
            const modeloProyecto = new Proyecto(null, Number(id));
            const proyecto = await modeloProyecto.ConsultarProyecto();

            if (!proyecto) {
                ctx.response.status = 404;
                ctx.response.body = {error: "No ha sido encontrado el proyecto consultado"};
                return;
            }
                ctx.response.status = 200;
                ctx.response.body = {message: "Proyecto encontrado:", proyecto};
        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al consultar el proyecto. No se pudo procesar la solicitud"};
        }
    };

    // Listar proyectos similares (Publica)
    export const listarSimilares = async (ctx:any) => {
        try {
            const {id} = ctx.params;
            const modeloProyecto = new Proyecto(null, Number(id));
            const proyecto = await modeloProyecto.ConsultarProyecto();

            if(!proyecto) {
                ctx.response.status = 404;
                ctx.response.body = {error: "No ha sido encontrado el proyecto consultado"};
                return;
            }

            if (!proyecto.constructoraID) {
                ctx.response.status = 200;
                ctx.response.body = [];
                return;
            }

            const similares = await new Proyecto().SeleccionarSimilares(proyecto.constructoraID, proyecto.estadoProyectoID);
                ctx.response.status = 200;
                ctx.response.body = similares.filter((p) => p.proyectoID !== Number(id));

        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al listar los proyectos similares"};
        }
    };
    // Listar historial de avances del proyecto (Publica)
    export const listarAvances = async (ctx:any) => {
        try {
            const { id } = ctx.params;
            const modeloProyecto = new Proyecto(null, Number(id));
            const avances = await modeloProyecto.SeleccionarAvances();

                ctx.response.status = 200;
                ctx.response.body = avances;
        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al listar el historial de avances del proyecto"};   
        }
    };
    

    // Crear proyecto (Privado y protegido el acceso unicamente debe ser para administrador)
    export const crearProyecto = async (ctx:Context) => {
        try {
            const body = await ctx.request.body.json();
            const {nombre, estadoProyectoID, porcentajeAvance, fechaInicio, fechaFin, constructoraID, descripcion, ubicacion} = body;

            if (!nombre || !estadoProyectoID) {
                ctx.response.status = 400;
                ctx.response.body = {error: "Nombre y estadoProyectoID son obligatorios"};
                return;
            }

           const idConstructora = constructoraID;

            if (!idConstructora) {
                ctx.response.status = 400;
                ctx.response.body = {error: "No fue posible determinar la constructora del proyecto"};
                return;
            }

            const nuevoProyecto = new Proyecto({
                nombre,
                estadoProyectoID: Number(estadoProyectoID),
                porcentajeAvance: porcentajeAvance ? String(porcentajeAvance) :  "0.00",
                fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
                fechaFin: fechaFin ? new Date(fechaFin) : null,
                constructoraID: idConstructora,
                descripcion: descripcion ?? null,
                ubicacion: ubicacion ?? null,
            });

            const filasAfectadas = await nuevoProyecto.InsertarProyecto();

            if (filasAfectadas > 0) {
                ctx.response.status = 201;
                ctx.response.body = {message: "Proyecto creado correctamente"};
            } else {
                ctx.response.status = 409;
                ctx.response.body = {error: "No se pudo crear el proyecto"};
            }

        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error interno al crear el proyecto"};
        }
    };

    // Editar proyecto (Privado y protegido. El acceso debe ser unicamente para constructora y administrador)
    export const editarProyecto = async (ctx:any) => {
        try {
            const {id} = ctx.params;
            const usuario = (ctx.state as any).user;

            const modeloConsulta = new Proyecto(null, Number(id));
            const existente = await modeloConsulta.ConsultarProyecto();

            if (!existente) {
                ctx.response.status = 404;
                ctx.response.body = {error: "Proyecto no encontrado"};
                return;
            }

            const esAdministrador = usuario?.rol === "Administrador";
            if (!esAdministrador && existente.constructoraID !== (ctx.state as any).constructoraID) {
                ctx.response.status = 403;
                ctx.response.body = {error: "No tienes permisos para editar este proyecto"};
                return;
            }

            const body = await ctx.request.body.json();
            const {nombre, estadoProyectoID, porcentajeAvance, fechaInicio, fechaFin, constructoraID, descripcion, ubicacion} = body;

            if (!nombre || !estadoProyectoID) {
                ctx.response.status = 400;
                ctx.response.body = {error: "Nombre y estadoProyectoID son obligatorios"};
                return;
            }
            const idConstructora = esAdministrador ? (constructoraID ?? existente.constructoraID) : existente.constructoraID;
            const proyectoEditado = new Proyecto({
                nombre,
                estadoProyectoID: Number(estadoProyectoID),
                porcentajeAvance: porcentajeAvance ? String(porcentajeAvance) : undefined,
                fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
                fechaFin: fechaFin ? new Date(fechaFin) : null,
                constructoraID: idConstructora,
                descripcion: descripcion ?? null,
                ubicacion: ubicacion ?? null,
            },
            Number(id)
        );

        const filasAfectadas = await proyectoEditado.ActualizarProyecto();
        if (filasAfectadas > 0) {
            ctx.response.status = 200;
            ctx.response.body = {message: "Proyecto actualizado  correctamente"};
        } else {
            ctx.response.status = 404;
            ctx.response.body = {error: "Proyecto no encontrado o sin cambios"};
        }
        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al editar el proyecto"};
        }
    };

    //Registra avance del proyecto (privado y protegido. El acceso debe ser unicamente para constructora)
    export const registrarAvance = async (ctx:any) => {
        try {
            const {id} = ctx.params;
            const body = await ctx.request.body.json();
            const { porcentaje, nota } = body;

            if (porcentaje === undefined || porcentaje === null) {
                ctx.response.status = 400;
                ctx.response.body = {error: "El porcentaje de avance es obligatorio"};
                return;
            }

            const usuario = (ctx.state as any).user;
                const idUsuario = Number(usuario?.sub);
                
                if (!idUsuario) {
                    ctx.response.status = 400;
                    ctx.response.body = {error: "No fue posible determinar al usuario que registra el avance"};
                    return;
                }

                const modeloProyecto = new Proyecto(null, Number(id));

                const existente = await modeloProyecto.ConsultarProyecto();
                if (!existente) {
                    ctx.response.status = 404;
                    ctx.response.body = {error: "Proyecto no encontrado"};
                    return;
                }
                if (existente.constructoraID !== (ctx.state as any).constructoraID) {
                    ctx.response.status = 403;
                    ctx.response.body = {error: "No tienes permisos para registrar avances en este proyecto"};
                    return;
                }

                const filasAfectadas = await modeloProyecto.RegistrarAvance(idUsuario, String(porcentaje), nota ?? null);

                if (filasAfectadas > 0) {
                    ctx.response.status = 201;
                    ctx.response.body = {message: "Avance registrado correctamente"};
                } else {
                    ctx.response.status = 409;
                    ctx.response.body = {error: "No se pudo registrar el avance"};
                }
        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al registrar el avance del proyecto"};
        }
    };

    // Solo administrador puede eliminar proyectos
    export const eliminarProyecto = async (ctx:any) => {
        try {
            const {id} = ctx.params;
            const modeloProyecto = new Proyecto(null, Number(id));
            const existente = await modeloProyecto.ConsultarProyecto();
            if (!existente) {
                ctx.response.status = 404;
                ctx.response.body = {error: "Proyecto no encontrado"};
                return;
            }

            const filasAfectadas = await modeloProyecto.EliminarProyecto();

            if (filasAfectadas > 0) {
                ctx.response.status = 200;
                ctx.response.body = {message: "Proyecto eliminado correctamente"};
            } else {
                ctx.response.status = 404;
                ctx.response.body = {error: "Proyecto no encontrado"};
            }
        } catch (error) {
            console.log(error);
            ctx.response.status = 500;
            ctx.response.body = {error: "Error al eliminar el proyecto"};
        }
    };