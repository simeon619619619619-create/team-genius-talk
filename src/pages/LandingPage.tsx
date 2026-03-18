import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, ArrowRight, Bot, Mail, TrendingUp, Globe, Calendar, Users, BookOpen, FileText, GitBranch, Zap, ChevronRight, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import logo from "@/assets/logo.png";

const bots = [
  { name: "Ивана", role: "Съдържание & Реклами", color: "#34d399", skills: "Instagram, Reels, Meta Ads, copywriting" },
  { name: "Лина", role: "Продажби & Клиенти", color: "#fb923c", skills: "CRM, follow-up, оферти, преговори" },
  { name: "Мария", role: "Email Маркетинг", color: "#f472b6", skills: "Newsletter, кампании, сегментация" },
  { name: "Дара", role: "Стратегия & Анализи", color: "#60a5fa", skills: "SWOT, KPI, конкуренция, финанси" },
  { name: "Елена", role: "Уеб & SEO", color: "#818cf8", skills: "SEO, UX, landing pages, оптимизация" },
  { name: "Софи", role: "Проджект Мениджър", color: "#fbbf24", skills: "Задачи, дедлайни, координация" },
];

const steps = [
  { icon: BookOpen, title: "Методология", desc: "5 модула — от визия до трафик стратегия", color: "text-violet-500", bg: "bg-violet-500/10" },
  { icon: TrendingUp, title: "Маркетинг план", desc: "6 стъпки — AI попълва от методологията", color: "text-blue-500", bg: "bg-blue-500/10" },
  { icon: GitBranch, title: "Бизнес процеси", desc: "Соц. мрежи, имейли, реклами с ботовете", color: "text-green-500", bg: "bg-green-500/10" },
  { icon: FileText, title: "Бизнес план", desc: "Седмичен график — AI казва кое е за теб", color: "text-orange-500", bg: "bg-orange-500/10" },
];

const plans = [
  {
    name: "Месечен",
    price: "€29",
    interval: "/месец",
    features: ["6 AI бота 24/7", "Неограничени съобщения", "Имейл маркетинг", "CRM интеграция"],
    popular: false,
  },
  {
    name: "6 месеца",
    price: "€149",
    interval: "/6 мес.",
    savings: "Спестяваш €25",
    features: ["Всичко от Месечен", "€24.80/мес вместо €29", "Приоритетна поддръжка", "API достъп"],
    popular: true,
  },
  {
    name: "Завинаги",
    price: "€499",
    interval: "еднократно",
    features: ["Всичко включено", "Бъдещи функции безплатно", "VIP поддръжка", "Без месечни плащания"],
    popular: false,
  },
];

const faqs = [
  { q: "Какво е Симора?", a: "AI платформа с екип от 6 бота, които управляват маркетинга, продажбите, имейлите и съдържанието на бизнеса ви 24/7." },
  { q: "Трябва ли да плащам веднага?", a: "Не. Методологията и маркетинг планът са безплатни. Плащате само когато активирате AI ботовете." },
  { q: "Какво включва безплатният период?", a: "7 дни пълен достъп до всички AI ботове. Отмени по всяко време." },
  { q: "Мога ли да използвам Симора за всякакъв бизнес?", a: "Да — e-commerce, услуги, SaaS, образование, агенции и всеки друг бизнес." },
  { q: "Какви интеграции поддържате?", a: "Resend (имейли), GoHighLevel (CRM), Meta Ads, Google Ads, WordPress, Shopify." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCTA = () => {
    if (user) {
      navigate("/dashboard");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <img src={logo} alt="Симора" className="h-8 dark:invert dark:brightness-200" />
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate("/dashboard")} size="sm">
                Към платформата <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/auth")}>Вход</Button>
                <Button size="sm" onClick={() => navigate("/auth")}>
                  Започни безплатно
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
            Методологията е безплатна
          </Badge>
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight leading-[1.1] mb-6">
            AI екип от 6 бота, който работи за бизнеса ти{" "}
            <span className="text-primary">24/7</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Симора замества 5 инструмента с един. Маркетинг, имейли, съдържание,
            продажби и анализи — всичко автоматизирано от AI екип, който познава бизнеса ти.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="h-14 px-8 text-base rounded-2xl shadow-xl" onClick={handleCTA}>
              Започни безплатно <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="h-14 px-8 text-base rounded-2xl" onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}>
              Как работи?
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">Без кредитна карта. Без ангажимент.</p>
        </div>
      </section>

      {/* Bots showcase */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Запознай се с екипа</h2>
            <p className="text-muted-foreground text-lg">6 AI бота, всеки специалист в своята област</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bots.map((bot) => (
              <Card key={bot.name} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ background: bot.color }}>
                      {bot.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold">{bot.name}</p>
                      <p className="text-xs text-muted-foreground">{bot.role}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{bot.skills}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">4 стъпки до работещ бизнес</h2>
            <p className="text-muted-foreground text-lg">Всяка стъпка се отключва след предишната</p>
          </div>
          <div className="space-y-6">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex items-start gap-5">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center border shrink-0", step.bg)}>
                      <Icon className={cn("h-7 w-7", step.color)} />
                    </div>
                    {i < steps.length - 1 && <div className="w-0.5 h-8 bg-border" />}
                  </div>
                  <div className="pt-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">Стъпка {i + 1}</Badge>
                      {i === 0 && <Badge className="text-xs bg-green-600">Безплатно</Badge>}
                    </div>
                    <h3 className="text-xl font-semibold mb-1">{step.title}</h3>
                    <p className="text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider mb-4">Без Симора</h3>
              <ul className="space-y-4">
                {[
                  "Плащаш за Mailchimp + Buffer + Jasper + CRM = €100+/мес",
                  "Губиш часове в ръчно създаване на постове и имейли",
                  "Нямаш стратегия — правиш каквото ти хрумне",
                  "Забравяш задачи и пропускаш дедлайни",
                  "Не знаеш какво работи и какво не",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-muted-foreground">
                    <span className="text-red-500 mt-0.5">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-green-500 uppercase tracking-wider mb-4">Със Симора</h3>
              <ul className="space-y-4">
                {[
                  "Един инструмент замества всички — €29/мес",
                  "AI ботовете създават съдържание и имейли за теб",
                  "Методология те води стъпка по стъпка",
                  "Седмичен график с напомняния за всяка задача",
                  "Анализи и KPI от Дара — знаеш какво работи",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Прости цени, без изненади</h2>
            <p className="text-muted-foreground text-lg">Методологията е безплатна. Плащаш само за AI ботовете.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className={cn(
                "relative overflow-hidden transition-all duration-300",
                plan.popular ? "border-primary shadow-lg shadow-primary/10 scale-[1.02]" : "border-border hover:border-primary/50"
              )}>
                {plan.popular && (
                  <div className="absolute -right-12 top-6 rotate-45 bg-primary px-12 py-1 text-xs font-semibold text-primary-foreground">
                    Популярен
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.interval}</span>
                  </div>
                  {"savings" in plan && plan.savings && (
                    <Badge variant="secondary" className="mb-4 bg-green-500/10 text-green-600 border-green-500/20">{plan.savings}</Badge>
                  )}
                  <ul className="space-y-3 mt-4 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"} onClick={handleCTA}>
                    Започни с 7 дни безплатно
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">7 дни безплатен пробен период. Отмени по всяко време.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-12">Често задавани въпроси</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details key={faq.q} className="group">
                <summary className="flex items-center justify-between cursor-pointer p-5 rounded-2xl bg-card border border-border/50 hover:border-border transition-colors">
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 transition-transform group-open:rotate-90" />
                </summary>
                <div className="px-5 pb-5 pt-2 text-muted-foreground">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Готов ли си да автоматизираш бизнеса си?</h2>
          <p className="text-lg text-muted-foreground mb-8">Започни с безплатната методология. AI екипът чака.</p>
          <Button size="lg" className="h-14 px-10 text-base rounded-2xl shadow-xl" onClick={handleCTA}>
            Започни безплатно <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src={logo} alt="Симора" className="h-6 dark:invert dark:brightness-200" />
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Симора. Всички права запазени.</p>
        </div>
      </footer>
    </div>
  );
}
