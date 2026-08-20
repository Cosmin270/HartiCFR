# syntax=docker/dockerfile:1

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY HartiCFR_BE.csproj ./
RUN dotnet restore HartiCFR_BE.csproj

COPY . ./
RUN dotnet publish HartiCFR_BE.csproj -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

# Render (and most PaaS) assign the listening port at runtime.
ENV ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080

# PORT is resolved at container start, not at build time.
ENTRYPOINT ["/bin/sh", "-c", "exec dotnet HartiCFR_BE.dll --urls http://+:${PORT:-8080}"]
