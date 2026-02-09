@echo off
echo Waiting for PostgreSQL installation to complete...
echo Herhangi bir pencereyi kapatmadan bekleyiniz...

set DB_NAME=oskaplus
set PG_USER=postgres

:check_postgres
sc query "HakedisPlus" | find "RUNNING" > nul
if %errorlevel% NEQ 0 (
    timeout /t 5 /nobreak > nul
    goto check_postgres
)
set PGPASSWORD=pL@!RiDuSw@TRoBr5wRo

"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U %PG_USER% -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '%DB_NAME%';" | find "1" > nul

if %errorlevel% EQU 0 (
	echo %DB_NAME% already exists.
) else (
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d postgres -c "DROP DATABASE IF EXISTS oskaplus;"
"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d postgres -c "SELECT rolname FROM pg_roles WHERE rolname = 'oskauser';" > check_user.txt

findstr /C:"oskauser" check_user.txt >nul
if %errorlevel% neq 0 (
    "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d postgres -c "CREATE USER oskauser WITH SUPERUSER PASSWORD '%PGPASSWORD%';"
) else (
    echo User already exists.
)

"C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d postgres -c "CREATE DATABASE oskaplus OWNER oskauser;"

"C:\Program Files\PostgreSQL\15\bin\pg_restore.exe" -U postgres -d oskaplus "%~dp0plus.backup"
)

echo Kurulum islemleri tamamlandi...
