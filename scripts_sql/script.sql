CREATE DATABASE IF NOT EXISTS espmjunior;
USE espmjunior;

-- DROP TABLE IF EXISTS tokenqr;
CREATE TABLE tokenqr (
  token char(64) NOT NULL,
  qr1 char(16) NOT NULL,
  qr2 char(16) NOT NULL
);

INSERT INTO tokenqr (token, qr1, qr2) VALUES ('', '', '');

-- DROP TABLE IF EXISTS perfil;
CREATE TABLE perfil (
  idperfil int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idperfil),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO perfil (nome) VALUES ('ADMINISTRADOR'), ('COMUM');

-- DROP TABLE IF EXISTS cargo;
CREATE TABLE cargo (
  idcargo int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idcargo),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO cargo (nome) VALUES ('ADMIN'), ('RH'), ('FINANCEIRO');

-- DROP TABLE IF EXISTS curso;
CREATE TABLE curso (
  idcurso int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  PRIMARY KEY (idcurso),
  UNIQUE KEY nome_UN (nome)
);

INSERT INTO curso (nome) VALUES ('NENHUM'), ('ADM'), ('RI'), ('PP'), ('CISO'), ('TECH');

-- DROP TABLE IF EXISTS usuario;
CREATE TABLE usuario (
  idusuario int NOT NULL AUTO_INCREMENT,
  login varchar(100) NOT NULL,
  nome varchar(100) NOT NULL,
  idperfil int NOT NULL,
  versao int NOT NULL,
  token char(32) DEFAULT NULL,
  idcargo int NOT NULL,
  idcurso int NOT NULL,
  semestre int NOT NULL,
  endereco varchar(100) NOT NULL,
  telefone varchar(20) NOT NULL,
  nascimento datetime NOT NULL,
  criacao datetime NOT NULL,
  dayoff int,
  PRIMARY KEY (idusuario),
  UNIQUE KEY login_UN (login),
  KEY usuario_idperfil_FK_idx (idperfil),
  KEY usuario_idcargo_FK_idx (idcargo),
  CONSTRAINT usuario_idperfil_FK FOREIGN KEY (idperfil) REFERENCES perfil (idperfil) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT usuario_idcargo_FK FOREIGN KEY (idcargo) REFERENCES cargo (idcargo) ON DELETE RESTRICT ON UPDATE RESTRICT
);

INSERT INTO usuario (login, nome, idperfil, versao, token, idcargo, idcurso, semestre, endereco, telefone, nascimento, criacao) VALUES ('ADMIN@ESPM.BR', 'ADMINISTRADOR', 1, 0, NULL, 1, 1, 1, '', '', NOW(), NOW());

-- DROP TABLE IF EXISTS ficha_medica;
CREATE TABLE ficha_medica (
  idusuario int NOT NULL,
  tipo_sanguineo varchar(5) NOT NULL,
  alergia varchar(100) NOT NULL,
  plano_saude varchar(50) NOT NULL,
  contato_emergencia varchar(20) NOT NULL,
  hospital_preferencia varchar(50) NOT NULL,
  PRIMARY KEY (idusuario),
  CONSTRAINT ficha_medica_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO ficha_medica (idusuario, tipo_sanguineo, alergia, plano_saude, contato_emergencia, hospital_preferencia) VALUES (1, '', '', '', '', '');

-- DROP TABLE IF EXISTS ponto;
CREATE TABLE ponto (
  idponto int NOT NULL AUTO_INCREMENT,
  idusuario int NOT NULL,
  entrada datetime NOT NULL,
  saida datetime NULL,
  PRIMARY KEY (idponto),
  KEY idusuario_FK_idx (idusuario),
  CONSTRAINT ponto_idusuario_FK FOREIGN KEY (idusuario) REFERENCES usuario (idusuario) ON DELETE CASCADE ON UPDATE CASCADE
);

-- DROP TABLE IF EXISTS tipoevento;
CREATE TABLE tipoevento (
  idtipoevento int NOT NULL AUTO_INCREMENT,
  nome varchar(50) NOT NULL,
  corfundo varchar(8) NOT NULL,
  cortexto varchar(8) NOT NULL,
  PRIMARY KEY (idtipoevento)
);

INSERT INTO tipoevento (nome, corfundo, cortexto) VALUES ('CURSO', '#990000', '#ffffff'), ('REUNIÃO', '#000099', '#ffffff'), ('PALESTRA', '#009900', '#ffffff'), ('WORKSHOP', '#009999', '#ffffff');

-- DROP TABLE IF EXISTS evento;
CREATE TABLE evento (
  idevento int NOT NULL AUTO_INCREMENT,
  idtipoevento int NOT NULL,
  nome varchar(50) NOT NULL,
  descricao varchar(200) NOT NULL,
  horainicial smallint NOT NULL,
  horafinal smallint NOT NULL,
  data datetime NOT NULL,
  PRIMARY KEY (idevento),
  KEY evento_idtipoevento_FK_idx (idtipoevento),
  CONSTRAINT evento_idtipoevento_FK FOREIGN KEY (idtipoevento) REFERENCES tipoevento (idtipoevento) ON DELETE RESTRICT ON UPDATE RESTRICT
);
