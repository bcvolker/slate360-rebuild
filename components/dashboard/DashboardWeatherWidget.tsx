"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  MapPin,
  Send,
  Snowflake,
  Sun,
  Wind,
} from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import type { WidgetSize } from "@/components/widgets/widget-meta";

type WeatherIconName = "sun" | "cloud-sun" | "cloud" | "rain" | "snow";

type ForecastItem = {
  day: string;
  hi: number;
  lo: number;
  icon: WeatherIconName;
  precip: number;
};

type ConstructionAlert = {
  message: string;
  severity: "warning" | "caution" | "info";
};

type WeatherState = {
  location: string;
  current: {
    temp: number;
    condition: string;
    humidity: number;
    wind: number;
    icon: WeatherIconName;
  };
  forecast: ForecastItem[];
  constructionAlerts: ConstructionAlert[];
};

type Props = {
  span: string;
  widgetColor: string;
  widgetSize: WidgetSize;
  onSetSize?: (size: WidgetSize) => void;
  liveWeather: WeatherState | null;
  fallbackForecast: ForecastItem[];
  fallbackAlerts: ConstructionAlert[];
  weatherLogged: boolean;
  onLogWeather: () => void;
};

const weatherIcon = (icon: WeatherIconName) => {
  switch (icon) {
    case "sun":
      return <Sun size={18} className="text-amber-400" />;
    case "cloud-sun":
      return <CloudSun size={18} className="text-gray-400" />;
    case "cloud":
      return <Cloud size={18} className="text-gray-400" />;
    case "rain":
      return <CloudRain size={18} className="text-blue-400" />;
    case "snow":
      return <Snowflake size={18} className="text-sky-300" />;
    default:
      return <Sun size={18} className="text-amber-400" />;
  }
};

export default function DashboardWeatherWidget({
  span,
  widgetColor,
  widgetSize,
  onSetSize,
  liveWeather,
  fallbackForecast,
  fallbackAlerts,
  weatherLogged,
  onLogWeather,
}: Props) {
  return (
    <WidgetCard
      icon={Cloud}
      title="Weather"
      span={span}
      delay={200}
      color={widgetColor}
      onSetSize={onSetSize}
      size={widgetSize}
      action={
        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
          <MapPin size={10} />
          {liveWeather?.location ?? "Location unavailable"}
        </span>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-50 to-sky-50 flex items-center justify-center mb-1">
              {weatherIcon(liveWeather?.current.icon ?? "cloud-sun")}
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900">
              {liveWeather?.current.temp ?? "--"}°
              <span className="text-base font-normal text-gray-400">F</span>
            </p>
            <p className="text-xs text-gray-500">{liveWeather?.current.condition ?? "Unavailable"}</p>
          </div>
          <div className="ml-auto text-right space-y-1">
            <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
              <Droplets size={10} />
              {liveWeather?.current.humidity ?? "--"}%
            </p>
            <p className="text-[10px] text-gray-400 flex items-center gap-1 justify-end">
              <Wind size={10} />
              {liveWeather?.current.wind ?? "--"} mph
            </p>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {(liveWeather?.forecast ?? fallbackForecast).map((forecast) => (
            <div key={forecast.day} className="text-center p-2 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
              <p className="text-[10px] text-gray-500 font-semibold mb-1">{forecast.day}</p>
              {weatherIcon(forecast.icon)}
              <p className="text-[10px] font-bold text-gray-900 mt-1">{forecast.hi}°</p>
              <p className="text-[9px] text-gray-400">{forecast.lo}°</p>
              {forecast.precip >= 40 && <p className="text-[9px] text-blue-500 font-medium mt-0.5">{forecast.precip}%💧</p>}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {(liveWeather?.constructionAlerts ?? fallbackAlerts).map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-2.5 rounded-xl text-xs ${
                alert.severity === "warning"
                  ? "bg-amber-50 text-amber-700"
                  : alert.severity === "caution"
                    ? "bg-orange-50 text-orange-700"
                    : "bg-blue-50 text-blue-700"
              }`}
            >
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              <span className="leading-relaxed">{alert.message}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onLogWeather}
          disabled={weatherLogged}
          className="w-full text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {weatherLogged ? (
            <>
              <CheckCircle2 size={13} className="text-emerald-500" /> Logged to daily report
            </>
          ) : (
            <>
              <Send size={12} /> Log to Daily Report
            </>
          )}
        </button>
      </div>
    </WidgetCard>
  );
}