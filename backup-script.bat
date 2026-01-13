@echo off
rem Script de backup automático do banco de dados ecommerce
rem Executa diariamente via Agendador de Tarefas

set BACKUP_DIR=C:\xampp\mysql\backups
set DATE=%DATE:~6,4%-%DATE:~3,2%-%DATE:~0,2%
set TIME=%TIME:~0,2%-%TIME:~3,2%-%TIME:~6,2%
set FILENAME=ecommerce_backup_%DATE%_%TIME%.sql

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Fazendo backup do banco ecommerce...
"C:\xampp\mysql\bin\mysqldump.exe" -u root --databases ecommerce > "%BACKUP_DIR%\%FILENAME%"

echo Backup concluído: %FILENAME%
pause