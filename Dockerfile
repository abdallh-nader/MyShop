# 1. Base image for running the app
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080

# 2. Build image
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY ["ShopApp.csproj", "./"]
RUN dotnet restore "ShopApp.csproj"
COPY . .
RUN dotnet build "ShopApp.csproj" -c Release -o /app/build

# 3. Publish image
FROM build AS publish
RUN dotnet publish "ShopApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

# 4. Final runtime image
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "ShopApp.dll"]