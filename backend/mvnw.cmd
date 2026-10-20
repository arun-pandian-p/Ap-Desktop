@echo off
setlocal
if exist "C:\Users\Rishi\apache-maven-3.9.16\bin\mvn.cmd" (
    call "C:\Users\Rishi\apache-maven-3.9.16\bin\mvn.cmd" %*
) else (
    mvn %*
)
