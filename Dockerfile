FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# نسخ ملف المشروع واسترجاع الحزم
COPY ["ShopApp.csproj", "./"]
RUN dotnet restore "ShopApp.csproj"

# نسخ باقي الملفات وبناء التطبيق
COPY . .
RUN dotnet publish "ShopApp.csproj" -c Release -o /app/publish /p:UseAppHost=false

# نسخ مجلد images الخارجي إلى مجلد النشر النهائي
RUN cp -r images /app/publish/images || true

# مرحلة التشغيل النهائي
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=build /app/publish .

# ضبط المنفذ والبيئة
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "ShopApp.dll"]