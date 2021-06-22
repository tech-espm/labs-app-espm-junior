import mysql = require("mysql2");
import appsettings = require("../appsettings");

let pool: mysql.Pool;

function init(poolConfig: mysql.PoolOptions): void {
	if (!poolConfig)
		throw new Error("Missing poolConfig");

	if (!pool)
		pool = mysql.createPool(poolConfig);
}

init(appsettings.sqlPool);

export = class Sql {
	// https://www.npmjs.com/package/mysql2

	private connection: mysql.PoolConnection | null = null;
	private pendingTransaction = false;
	public linhasAfetadas = 0;
	public resultFields: mysql.FieldPacket[] | null = null;

	public static async conectar<T>(callback: (sql: Sql) => Promise<T>): Promise<T> {
		return new Promise<T>(function (resolve, reject) {
			pool.getConnection(function (error, connection) {
				if (error) {
					reject(error);
					return;
				}

				const sql = new Sql();
				sql.connection = connection;

				function cleanUp() {
					if (sql) {
						sql.connection = null;
						sql.resultFields = null;
					}
					connection.release();
				}

				try {
					callback(sql)
						.then(function (value: T) {
							if (sql.pendingTransaction) {
								sql.pendingTransaction = false;
								connection.rollback(function () {
									cleanUp();

									resolve(value);
								});
							} else {
								cleanUp();
								resolve(value);
							}
						}, function (reason) {
							if (sql.pendingTransaction) {
								sql.pendingTransaction = false;
								connection.rollback(function () {
									cleanUp();

									reject(reason);
								});
							} else {
								cleanUp();
								reject(reason);
							}
						});
				} catch (e) {
					if (sql.pendingTransaction) {
						sql.pendingTransaction = false;
						connection.rollback(function () {
							cleanUp();

							reject(e);
						});
					} else {
						cleanUp();
						reject(e);
					}
				}
			});
		});
	}

	public async query<T>(queryStr: string, values?: any): Promise<T[]> {
		return new Promise<T[]>((resolve, reject) => {
			const callback = (error: mysql.QueryError | null, results?: any, fields?: mysql.FieldPacket[]) => {
				if (error) {
					reject(error);
					return;
				}

				this.linhasAfetadas = parseInt(results.affectedRows) | 0;
				this.resultFields = (fields || null);

				resolve(results as T[]);
			};

			if (!this.connection)
				throw new Error("Null connection");

			if (values && values.length)
				this.connection.query(queryStr, values, callback);
			else
				this.connection.query(queryStr, callback);
		});
	}

	public async scalar<T>(queryStr: string, values?: any): Promise<T | null> {
		return new Promise<T | null>((resolve, reject) => {
			const callback = (error: mysql.QueryError | null, results?: any, fields?: mysql.FieldPacket[]) => {
				if (error) {
					reject(error);
					return;
				}

				this.linhasAfetadas = parseInt(results.affectedRows) | 0;
				this.resultFields = (fields || null);

				if (results) {
					const r = results[0];

					if (r) {
						for (let i in r) {
							resolve(r[i]);
							return;
						}
					}
				}

				resolve(null);
			};

			if (!this.connection)
				throw new Error("Null connection");

			if (values && values.length)
				this.connection.query(queryStr, values, callback);
			else
				this.connection.query(queryStr, callback);
		});
	}

	public async beginTransaction(): Promise<void> {
		if (this.pendingTransaction)
			throw new Error("There is already an open transaction in this connection");

		return new Promise<void>((resolve, reject) => {
			if (!this.connection)
				throw new Error("Null connection");

			this.connection.beginTransaction((error) => {
				if (error) {
					reject(error);
					return;
				}

				this.pendingTransaction = true;

				resolve();
			});
		});
	}

	public async commit(): Promise<void> {
		if (!this.pendingTransaction)
			return;

		return new Promise<void>((resolve, reject) => {
			if (!this.connection)
				throw new Error("Null connection");

			this.connection.commit((error) => {
				if (error) {
					reject(error);
					return;
				}

				this.pendingTransaction = false;

				resolve();
			});
		});
	}

	public async rollback(): Promise<void> {
		if (!this.pendingTransaction)
			return;

		return new Promise<void>((resolve, reject) => {
			if (!this.connection)
				throw new Error("Null connection");

			this.connection.rollback(() => {
				this.pendingTransaction = false;

				resolve();
			});
		});
	}
};
