import { useState } from "react";
import { STRIPE_PLANS } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, ExternalLink, Crown, Calendar, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PricingTab() {
  const plans = [
    {
      key: "lifetime",
      icon: Crown,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10 border-yellow-500/20",
      ...STRIPE_PLANS.lifetime,
    },
    {
      key: "yearly",
      icon: Calendar,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 border-blue-500/20",
      ...STRIPE_PLANS.yearly,
    },
    {
      key: "monthly",
      icon: Repeat,
      color: "text-green-500",
      bgColor: "bg-green-500/10 border-green-500/20",
      ...STRIPE_PLANS.monthly,
    },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Ценови планове (Stripe)
          </CardTitle>
          <CardDescription>
            Текущи ценови планове конфигурирани в Stripe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map(plan => (
              <div key={plan.key} className={`rounded-xl border p-6 ${plan.bgColor}`}>
                <div className="flex items-center gap-2 mb-4">
                  <plan.icon className={`h-5 w-5 ${plan.color}`} />
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                </div>
                <p className="text-3xl font-bold mb-1">${plan.price}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {plan.interval ? `/ ${plan.interval === "year" ? "година" : "месец"}` : "еднократно"}
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Price ID:</span>
                    <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{plan.priceId.slice(-8)}</code>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Product ID:</span>
                    <code className="text-xs bg-background/50 px-1.5 py-0.5 rounded">{plan.productId.slice(-8)}</code>
                  </div>
                  {plan.interval && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Пробен период:</span>
                      <Badge variant="outline" className="text-xs">7 дни</Badge>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Управление в Stripe</CardTitle>
          <CardDescription>
            За промяна на цени, създаване на нови планове или управление на клиенти
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => window.open("https://dashboard.stripe.com/products", "_blank")}
          >
            <span>Stripe Products & Prices</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => window.open("https://dashboard.stripe.com/customers", "_blank")}
          >
            <span>Stripe Customers</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => window.open("https://dashboard.stripe.com/subscriptions", "_blank")}
          >
            <span>Stripe Subscriptions</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => window.open("https://dashboard.stripe.com/payments", "_blank")}
          >
            <span>Stripe Payments</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Бъдещи функции</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Директна промяна на цени от админ панела
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Custom планове за отделни потребители
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Автоматични отстъпки при обем
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Revenue графики и прогнози
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
