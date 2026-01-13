@echo off
echo Criando backup do banco de dados...
set timestamp=%date:~-4%%date:~3,2%%date:~0,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set timestamp=%timestamp: =0%
set filename=backup_ecommerce_%timestamp%.sql

cd c:\xampp\mysql\bin
mysqldump -u root ecommerce > "c:\xampp\htdocs\myd_adm\Modules\e-comece\%filename%"

if %ERRORLEVEL% EQU 0 (
    echo Backup criado com sucesso: %filename%
) else (
    echo Erro ao criar backup!
)
pause
