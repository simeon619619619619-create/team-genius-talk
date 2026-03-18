-- Organization bots table — stores AI bots per organization
CREATE TABLE IF NOT EXISTS public.organization_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  bot_id text NOT NULL, -- e.g. "bot-1"
  name text NOT NULL,
  role text NOT NULL,
  process text NOT NULL DEFAULT '',
  frequency text NOT NULL DEFAULT '',
  automations jsonb NOT NULL DEFAULT '[]',
  tasks jsonb NOT NULL DEFAULT '[]',
  task_groups jsonb NOT NULL DEFAULT '[]',
  skills jsonb NOT NULL DEFAULT '[]',
  shirt_color text NOT NULL DEFAULT '#818cf8',
  hair_color text NOT NULL DEFAULT '#4a2810',
  skin_color text NOT NULL DEFAULT '#f5c6a0',
  locked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, bot_id)
);

ALTER TABLE public.organization_bots ENABLE ROW LEVEL SECURITY;

-- Users can read/write bots for organizations they belong to
CREATE POLICY "Members can view org bots"
  ON public.organization_bots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid()
    )
    OR
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

CREATE POLICY "Owners can manage org bots"
  ON public.organization_bots FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    organization_id IN (
      SELECT id FROM public.organizations WHERE owner_id = auth.uid()
    )
  );

-- Function to seed default bots for an organization
CREATE OR REPLACE FUNCTION public.seed_default_bots(org_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO public.organization_bots (organization_id, bot_id, name, role, process, frequency, automations, tasks, task_groups, skills, shirt_color, hair_color, skin_color, locked)
  VALUES
    (org_id, 'bot-1', 'Ивана', 'Съдържание & Реклами', 'Content + Ads', 'Ежедневно',
     '["Posts", "Stories", "Reels", "Meta Ads", "Анализи"]'::jsonb, '[]'::jsonb,
     '[{"id":"tg-1a","title":"Създаване на съдържание","subtasks":[{"id":"st-1a1","text":"Планиране на месечен контент календар","done":false},{"id":"st-1a2","text":"Генериране на 5 идеи за постове тази седмица","done":false},{"id":"st-1a3","text":"Напиши caption за Instagram пост","done":false},{"id":"st-1a4","text":"Подготви script за Reels/TikTok видео","done":false},{"id":"st-1a5","text":"Генерирай 20 хаштагa за нишата ми","done":false}]},{"id":"tg-1c","title":"Анализ на реклами","subtasks":[{"id":"st-1c1","text":"Анализирай рекламите за последните 7 дни","done":false},{"id":"st-1c2","text":"Покажи ROAS и CPM по кампании","done":false},{"id":"st-1c3","text":"Дай препоръки за оптимизация на рекламите","done":false},{"id":"st-1c4","text":"Сравни performance на рекламите този vs миналия месец","done":false},{"id":"st-1c5","text":"Публикувай пост в Instagram","done":false}]},{"id":"tg-1b","title":"Инструменти","subtasks":[{"id":"st-1b1","text":"Отвори Canva за дизайн","done":false,"action":{"type":"open_url","url":"https://www.canva.com"}},{"id":"st-1b2","text":"Отвори Meta Ads Manager","done":false,"action":{"type":"open_url","url":"https://adsmanager.facebook.com"}},{"id":"st-1b3","text":"Отвори Meta Business Suite","done":false,"action":{"type":"open_url","url":"https://business.facebook.com"}}]}]'::jsonb,
     '["контент", "соц. мрежи", "Instagram", "Reels", "Stories", "copywriting", "дизайн", "календар", "хаштагове", "реклами", "Meta Ads", "Facebook Ads", "анализ", "ROAS", "CPM", "CTR"]'::jsonb,
     '#34d399', '#8b4513', '#f5d0b0', true),

    (org_id, 'bot-2', 'Лина', 'Продажби & Клиенти', 'Lead Pipeline', 'При нужда',
     '["CRM", "Follow-up", "Оферти"]'::jsonb, '[]'::jsonb,
     '[{"id":"tg-2a","title":"Продажби","subtasks":[{"id":"st-2a1","text":"Напиши follow-up имейл за потенциален клиент","done":false},{"id":"st-2a2","text":"Генерирай оферта/предложение за услуга","done":false},{"id":"st-2a3","text":"Анализирай защо клиент не купи и предложи подход","done":false},{"id":"st-2a4","text":"Създай скрипт за продажбено обаждане","done":false}]},{"id":"tg-2b","title":"Инструменти","subtasks":[{"id":"st-2b1","text":"Отвори Stripe Dashboard","done":false,"action":{"type":"open_url","url":"https://dashboard.stripe.com"}}]}]'::jsonb,
     '["продажби", "лийдове", "follow-up", "клиенти", "имейл", "оферти", "преговори", "CRM"]'::jsonb,
     '#fb923c', '#3d1c02', '#f5c8b0', true),

    (org_id, 'bot-3', 'Мария', 'Email Маркетинг', 'Email Campaigns', 'Седмично',
     '["Newsletter", "Автоматизации", "Сегменти"]'::jsonb, '[]'::jsonb,
     '[{"id":"tg-3a","title":"Имейл кампании","subtasks":[{"id":"st-3a1","text":"Напиши седмичен newsletter","done":false},{"id":"st-3a2","text":"Генерирай 5 subject line варианта за A/B тест","done":false},{"id":"st-3a3","text":"Създай welcome email за нови абонати","done":false},{"id":"st-3a4","text":"Напиши промоционален имейл за оферта","done":false}]}]'::jsonb,
     '["имейл", "newsletter", "кампании", "автоматизация", "сегментация", "копирайтинг", "subject line"]'::jsonb,
     '#f472b6', '#1a0a00', '#f0b88a', true),

    (org_id, 'bot-4', 'Дара', 'Стратегия & Анализи', 'Business Analytics', 'Седмично',
     '["KPIs", "Отчети", "Конкуренция"]'::jsonb, '[]'::jsonb,
     '[{"id":"tg-4a","title":"Бизнес анализи","subtasks":[{"id":"st-4a1","text":"Направи SWOT анализ на бизнеса ми","done":false},{"id":"st-4a2","text":"Анализирай конкурентите ми и предложи стратегия","done":false},{"id":"st-4a3","text":"Определи 5 ключови KPI за следващия месец","done":false},{"id":"st-4a4","text":"Създай финансова прогноза за следващото тримесечие","done":false}]},{"id":"tg-4b","title":"Инструменти","subtasks":[{"id":"st-4b1","text":"Google Analytics","done":false,"action":{"type":"open_url","url":"https://analytics.google.com"}},{"id":"st-4b2","text":"Google Trends","done":false,"action":{"type":"open_url","url":"https://trends.google.com"}}]}]'::jsonb,
     '["стратегия", "анализи", "KPI", "конкуренция", "SWOT", "пазарно проучване", "бизнес план", "финанси"]'::jsonb,
     '#60a5fa', '#660000', '#e8b898', true),

    (org_id, 'bot-5', 'Елена', 'Уеб & Техническа поддръжка', 'Web Maintenance', '24/7',
     '["SEO Check", "Uptime", "Performance"]'::jsonb, '[]'::jsonb,
     '[{"id":"tg-5a","title":"Уеб оптимизация","subtasks":[{"id":"st-5a1","text":"Напиши SEO-оптимизиран текст за начална страница","done":false},{"id":"st-5a2","text":"Генерирай meta description за 5 страници","done":false},{"id":"st-5a3","text":"Предложи подобрения за UX на сайта","done":false},{"id":"st-5a4","text":"Създай копи за Landing Page","done":false}]},{"id":"tg-5b","title":"Проверки","subtasks":[{"id":"st-5b1","text":"Google PageSpeed","done":false,"action":{"type":"open_url","url":"https://pagespeed.web.dev"}},{"id":"st-5b2","text":"Google Search Console","done":false,"action":{"type":"open_url","url":"https://search.google.com/search-console"}}]}]'::jsonb,
     '["уеб", "SEO", "оптимизация", "поддръжка", "performance", "UX", "landing page", "копирайтинг за уеб"]'::jsonb,
     '#818cf8', '#4a2810', '#f5c6a0', true),

    (org_id, 'bot-6', 'Софи', 'Проджект Мениджър', 'Project Tracking', 'Ежедневно',
     '["Задачи", "Дедлайни", "Координация"]'::jsonb, '[]'::jsonb,
     '[{"id":"tg-6a","title":"Управление на проекти","subtasks":[{"id":"st-6a1","text":"Планирай задачите за тази седмица","done":false},{"id":"st-6a2","text":"Приоритизирай текущите задачи","done":false},{"id":"st-6a3","text":"Направи ретроспектива на миналата седмица","done":false},{"id":"st-6a4","text":"Създай timeline за нов проект","done":false}]}]'::jsonb,
     '["проджект мениджмънт", "задачи", "дедлайни", "планиране", "координация", "екип", "приоритизация", "ретроспектива"]'::jsonb,
     '#fbbf24', '#2c1608', '#f0c8a0', true)
  ON CONFLICT (organization_id, bot_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: auto-seed bots when a new organization is created
CREATE OR REPLACE FUNCTION public.on_organization_created()
RETURNS trigger AS $$
BEGIN
  PERFORM public.seed_default_bots(NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_seed_bots_on_org_create ON public.organizations;
CREATE TRIGGER trigger_seed_bots_on_org_create
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_organization_created();

-- Seed default bots for ALL existing organizations
DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT id FROM public.organizations LOOP
    PERFORM public.seed_default_bots(org.id);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
