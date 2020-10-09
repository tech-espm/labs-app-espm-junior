import Sql = require("../infra/sql"); 

export = class Ponto {
	public idponto: number;
    public idusuario: number;
    public entrada: string;
    public saida: string;

// Validação necessária ??
// Arrumar/Excluir o Try Catch do INSERT e UPDATE 


public static async listar(): Promise<Ponto[]> {
    let lista: Ponto[] = null;

    await Sql.conectar(async (sql: Sql) => {
        lista = (await sql.query("select idusuario, entrada, saida from ponto order by idusuario")) as Ponto[];
    });

    return lista || [];
}

public static async obter(idponto: number): Promise<Ponto> {
    let lista: Ponto[] = null;

    await Sql.conectar(async (sql: Sql) => {
        lista = (await sql.query("select idponto, idusuario, entrada, saida from ponto where idponto = ?", [idponto])) as Ponto[];
    });

    return (lista && lista[0]) || null;
}

public static async criar(p: Ponto): Promise<string> {  
    let res: string;

    // Se houver validação:
    // if ((res = Ponto.validar(p)))
    //     return res;

    await Sql.conectar(async (sql: Sql) => {
        // try {
            await sql.query("insert into Ponto (entrada, saida) values (?, ?)", [p.entrada, p.saida]);
        // } catch (e) {
        //     if (e.code && e.code === "ER_DUP_ENTRY")
        //         res = `O ponto ${p.nome} já existe`;
        //     else
        //         throw e;
        // }
    });

    return res;
}

public static async alterar(p: Ponto): Promise<string> {
    let res: string;
    
    // Se houver validação:
    // if ((res = Ponto.validar(p)))
    //     return res;

    await Sql.conectar(async (sql: Sql) => {
        // try {
            await sql.query("update ponto set idusuario = ?, entrada = ?, saida = ? where idponto = ?", [p.idusuario, p.entrada, p.saida, p.idponto]);
            res = sql.linhasAfetadas.toString();
        // } catch (e) {
        //     if (e.code && e.code === "ER_DUP_ENTRY")
        //         res = `O ponto ${p.nome} já existe`;
        //     else
        //         throw e;
        // }
    });

    return res;
}

public static async excluir(idponto: number): Promise<string> {
    let res: string = null;

    await Sql.conectar(async (sql: Sql) => {
        await sql.query("delete from perfil where idponto = ?", [idponto]);
        res = sql.linhasAfetadas.toString();
    });

    return res;
}
};