import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search, Plus, Download, Loader2, Building2, Globe, Mail, Phone,
  Instagram, MapPin, Trash2, CheckCircle2, Eye, Pencil, Sparkles,
  RefreshCw, ExternalLink, Filter, Users
} from "lucide-react";

interface BusinessNiche {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  created_at: string;
}

interface BusinessEntry {
  id: string;
  niche_id: string | null;
  company_name: string;
  website: string | null;
  email: string | null;
  phone: string | null;
  instagram: string | null;
  facebook: string | null;
  linkedin: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  description: string | null;
  employee_count: string | null;
  revenue_range: string | null;
  contact_person: string | null;
  contact_role: string | null;
  tags: string[];
  source: string | null;
  verified: boolean;
  created_at: string;
}

export function BusinessDirectoryTab() {
  const [niches, setNiches] = useState<BusinessNiche[]>([]);
  const [businesses, setBusinesses] = useState<BusinessEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [scraping, setScraping] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedNiche, setSelectedNiche] = useState<string>("all");
  const [selectedCity, setSelectedCity] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showScrapeDialog, setShowScrapeDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState<BusinessEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<BusinessEntry | null>(null);

  // Scrape form
  const [scrapeNiche, setScrapeNiche] = useState("");
  const [scrapeCity, setScrapeCity] = useState("София");
  const [scrapeNicheId, setScrapeNicheId] = useState("");

  // Add form
  const [addForm, setAddForm] = useState({
    company_name: "", website: "", email: "", phone: "",
    instagram: "", facebook: "", address: "", city: "София",
    country: "България", description: "", employee_count: "",
    contact_person: "", contact_role: "", niche_id: "", tags: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: nichesData } = await supabase
      .from("business_niches")
      .select("*")
      .order("name");

    if (nichesData) setNiches(nichesData);

    let query = supabase
      .from("business_directory")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedNiche !== "all") {
      query = query.eq("niche_id", selectedNiche);
    }

    const { data: bizData } = await query;
    if (bizData) setBusinesses(bizData);

    setLoading(false);
  }, [selectedNiche]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScrape = async () => {
    if (!scrapeNiche.trim()) {
      toast.error("Въведи ниша за търсене");
      return;
    }

    setScraping(true);
    try {
      const { data, error } = await supabase.functions.invoke("scrape-businesses", {
        body: {
          niche: scrapeNiche,
          city: scrapeCity || undefined,
          country: "България",
          nicheId: scrapeNicheId || undefined,
        },
      });

      if (error) throw error;

      toast.success(`Намерени ${data.found} фирми, добавени ${data.inserted}`);
      setShowScrapeDialog(false);
      setScrapeNiche("");
      fetchData();
    } catch (err: any) {
      toast.error("Грешка: " + (err.message || "Неуспешно търсене"));
    } finally {
      setScraping(false);
    }
  };

  const handleAddManual = async () => {
    if (!addForm.company_name.trim()) {
      toast.error("Въведи име на фирмата");
      return;
    }

    const { error } = await supabase.from("business_directory").insert({
      company_name: addForm.company_name,
      website: addForm.website || null,
      email: addForm.email || null,
      phone: addForm.phone || null,
      instagram: addForm.instagram || null,
      facebook: addForm.facebook || null,
      address: addForm.address || null,
      city: addForm.city || null,
      country: addForm.country || "България",
      description: addForm.description || null,
      employee_count: addForm.employee_count || null,
      contact_person: addForm.contact_person || null,
      contact_role: addForm.contact_role || null,
      niche_id: addForm.niche_id || null,
      tags: addForm.tags ? addForm.tags.split(",").map(t => t.trim()) : [],
      source: "manual",
      verified: true,
    });

    if (error) {
      toast.error("Грешка: " + error.message);
      return;
    }

    toast.success("Фирмата е добавена");
    setShowAddDialog(false);
    setAddForm({
      company_name: "", website: "", email: "", phone: "",
      instagram: "", facebook: "", address: "", city: "София",
      country: "България", description: "", employee_count: "",
      contact_person: "", contact_role: "", niche_id: "", tags: "",
    });
    fetchData();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("business_directory").delete().eq("id", id);
    if (error) {
      toast.error("Грешка при изтриване");
      return;
    }
    setBusinesses(prev => prev.filter(b => b.id !== id));
    toast.success("Фирмата е изтрита");
  };

  const handleVerify = async (id: string, verified: boolean) => {
    const { error } = await supabase
      .from("business_directory")
      .update({ verified })
      .eq("id", id);

    if (error) {
      toast.error("Грешка");
      return;
    }

    setBusinesses(prev => prev.map(b => b.id === id ? { ...b, verified } : b));
    toast.success(verified ? "Верифицирана" : "Премахната верификация");
  };

  const handleExportCSV = () => {
    const filtered = getFilteredBusinesses();
    if (filtered.length === 0) {
      toast.error("Няма данни за експорт");
      return;
    }

    const headers = ["Фирма", "Уебсайт", "Имейл", "Телефон", "Instagram", "Facebook", "Адрес", "Град", "Описание", "Служители", "Контакт", "Тагове"];
    const rows = filtered.map(b => [
      b.company_name, b.website || "", b.email || "", b.phone || "",
      b.instagram || "", b.facebook || "", b.address || "", b.city || "",
      b.description || "", b.employee_count || "", b.contact_person || "",
      (b.tags || []).join("; "),
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.map(cell => `"${(cell || "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business_directory_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Експортирани ${filtered.length} фирми`);
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;
    const { error } = await supabase
      .from("business_directory")
      .update({
        company_name: editingEntry.company_name,
        website: editingEntry.website,
        email: editingEntry.email,
        phone: editingEntry.phone,
        instagram: editingEntry.instagram,
        facebook: editingEntry.facebook,
        address: editingEntry.address,
        city: editingEntry.city,
        description: editingEntry.description,
        employee_count: editingEntry.employee_count,
        contact_person: editingEntry.contact_person,
        contact_role: editingEntry.contact_role,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingEntry.id);

    if (error) {
      toast.error("Грешка при запис");
      return;
    }

    setBusinesses(prev => prev.map(b => b.id === editingEntry.id ? editingEntry : b));
    setEditingEntry(null);
    toast.success("Записано");
  };

  const getFilteredBusinesses = () => {
    return businesses.filter(b => {
      const matchesSearch = !searchTerm ||
        b.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.city?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCity = !selectedCity ||
        b.city?.toLowerCase().includes(selectedCity.toLowerCase());

      return matchesSearch && matchesCity;
    });
  };

  const getNicheName = (nicheId: string | null) => {
    if (!nicheId) return "Без категория";
    return niches.find(n => n.id === nicheId)?.name || "Неизвестна";
  };

  const getNicheIcon = (nicheId: string | null) => {
    if (!nicheId) return "📁";
    return niches.find(n => n.id === nicheId)?.icon || "📁";
  };

  const filtered = getFilteredBusinesses();
  const cities = [...new Set(businesses.map(b => b.city).filter(Boolean))];
  const verifiedCount = businesses.filter(b => b.verified).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Общо фирми</p>
                <p className="text-3xl font-bold">{businesses.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-blue-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Верифицирани</p>
                <p className="text-3xl font-bold text-green-500">{verifiedCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ниши</p>
                <p className="text-3xl font-bold">{niches.length}</p>
              </div>
              <Filter className="h-8 w-8 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Градове</p>
                <p className="text-3xl font-bold">{cities.length}</p>
              </div>
              <MapPin className="h-8 w-8 text-orange-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowScrapeDialog(true)} className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Търсене
        </Button>
        <Button variant="outline" onClick={() => setShowAddDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Добави ръчно
        </Button>
        <Button variant="outline" onClick={handleExportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Експорт CSV
        </Button>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Обнови
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Търси фирма, имейл, град..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedNiche} onValueChange={setSelectedNiche}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Всички ниши" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Всички ниши</SelectItem>
                {niches.map(n => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.icon} {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Град..."
              value={selectedCity}
              onChange={e => setSelectedCity(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Niches overview */}
      <div className="flex flex-wrap gap-2">
        {niches.map(n => {
          const count = businesses.filter(b => b.niche_id === n.id).length;
          return (
            <Badge
              key={n.id}
              variant={selectedNiche === n.id ? "default" : "outline"}
              className="cursor-pointer text-sm py-1 px-3"
              onClick={() => setSelectedNiche(selectedNiche === n.id ? "all" : n.id)}
            >
              {n.icon} {n.name} ({count})
            </Badge>
          );
        })}
      </div>

      {/* Business list */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Показани {filtered.length} от {businesses.length} фирми
        </p>

        {filtered.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">Няма намерени фирми</p>
                <p className="text-muted-foreground mt-1">
                  Използвай "AI Търсене" за да събереш информация от интернет
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {filtered.map(biz => (
              <Card key={biz.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getNicheIcon(biz.niche_id)}</span>
                        <h3 className="font-semibold truncate">{biz.company_name}</h3>
                        {biz.verified && (
                          <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        )}
                        <Badge variant="outline" className="text-xs shrink-0">
                          {getNicheName(biz.niche_id)}
                        </Badge>
                      </div>

                      {biz.description && (
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-1">{biz.description}</p>
                      )}

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                        {biz.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {biz.city}
                          </span>
                        )}
                        {biz.website && (
                          <a href={biz.website.startsWith("http") ? biz.website : `https://${biz.website}`}
                             target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-1 text-blue-500 hover:underline">
                            <Globe className="h-3 w-3" /> Сайт
                          </a>
                        )}
                        {biz.email && (
                          <a href={`mailto:${biz.email}`} className="flex items-center gap-1 hover:text-foreground">
                            <Mail className="h-3 w-3" /> {biz.email}
                          </a>
                        )}
                        {biz.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {biz.phone}
                          </span>
                        )}
                        {biz.instagram && (
                          <a href={`https://instagram.com/${biz.instagram}`}
                             target="_blank" rel="noopener noreferrer"
                             className="flex items-center gap-1 text-pink-500 hover:underline">
                            <Instagram className="h-3 w-3" /> @{biz.instagram}
                          </a>
                        )}
                        {biz.employee_count && (
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {biz.employee_count}
                          </span>
                        )}
                      </div>

                      {biz.tags && biz.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {biz.tags.slice(0, 5).map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">{tag}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => setShowDetailDialog(biz)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingEntry({ ...biz })}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleVerify(biz.id, !biz.verified)}
                      >
                        <CheckCircle2 className={`h-4 w-4 ${biz.verified ? "text-green-500" : ""}`} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(biz.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* AI Scrape Dialog */}
      <Dialog open={showScrapeDialog} onOpenChange={setShowScrapeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Търсене на фирми
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ниша / Индустрия *</Label>
              <Input
                placeholder="напр. Фитнес зали, Ресторанти, IT компании..."
                value={scrapeNiche}
                onChange={e => setScrapeNiche(e.target.value)}
              />
            </div>
            <div>
              <Label>Град</Label>
              <Input
                placeholder="напр. София, Пловдив, Варна..."
                value={scrapeCity}
                onChange={e => setScrapeCity(e.target.value)}
              />
            </div>
            <div>
              <Label>Категория</Label>
              <Select value={scrapeNicheId} onValueChange={setScrapeNicheId}>
                <SelectTrigger>
                  <SelectValue placeholder="Избери категория (по избор)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Без категория</SelectItem>
                  {niches.map(n => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.icon} {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScrapeDialog(false)}>Отказ</Button>
            <Button onClick={handleScrape} disabled={scraping} className="gap-2">
              {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {scraping ? "Търся..." : "Търси с AI"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Manual Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добави фирма ръчно</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Име на фирмата *</Label>
              <Input value={addForm.company_name} onChange={e => setAddForm(p => ({ ...p, company_name: e.target.value }))} />
            </div>
            <div>
              <Label>Категория</Label>
              <Select value={addForm.niche_id} onValueChange={v => setAddForm(p => ({ ...p, niche_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Избери" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map(n => (
                    <SelectItem key={n.id} value={n.id}>{n.icon} {n.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Уебсайт</Label>
                <Input value={addForm.website} onChange={e => setAddForm(p => ({ ...p, website: e.target.value }))} />
              </div>
              <div>
                <Label>Имейл</Label>
                <Input value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Телефон</Label>
                <Input value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <Label>Instagram</Label>
                <Input value={addForm.instagram} onChange={e => setAddForm(p => ({ ...p, instagram: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Град</Label>
                <Input value={addForm.city} onChange={e => setAddForm(p => ({ ...p, city: e.target.value }))} />
              </div>
              <div>
                <Label>Служители</Label>
                <Select value={addForm.employee_count} onValueChange={v => setAddForm(p => ({ ...p, employee_count: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Брой" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-10">1-10</SelectItem>
                    <SelectItem value="11-50">11-50</SelectItem>
                    <SelectItem value="51-200">51-200</SelectItem>
                    <SelectItem value="200+">200+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Контактно лице</Label>
                <Input value={addForm.contact_person} onChange={e => setAddForm(p => ({ ...p, contact_person: e.target.value }))} />
              </div>
              <div>
                <Label>Длъжност</Label>
                <Input value={addForm.contact_role} onChange={e => setAddForm(p => ({ ...p, contact_role: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div>
              <Label>Тагове (разделени с запетая)</Label>
              <Input value={addForm.tags} onChange={e => setAddForm(p => ({ ...p, tags: e.target.value }))} placeholder="напр. храна, доставка, ресторант" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Отказ</Button>
            <Button onClick={handleAddManual}>Добави</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!showDetailDialog} onOpenChange={() => setShowDetailDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showDetailDialog && getNicheIcon(showDetailDialog.niche_id)}
              {showDetailDialog?.company_name}
              {showDetailDialog?.verified && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </DialogTitle>
          </DialogHeader>
          {showDetailDialog && (
            <div className="space-y-3">
              {showDetailDialog.description && (
                <p className="text-muted-foreground">{showDetailDialog.description}</p>
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {showDetailDialog.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <a href={showDetailDialog.website.startsWith("http") ? showDetailDialog.website : `https://${showDetailDialog.website}`}
                       target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center gap-1">
                      {showDetailDialog.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}
                {showDetailDialog.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${showDetailDialog.email}`} className="hover:underline">{showDetailDialog.email}</a>
                  </div>
                )}
                {showDetailDialog.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" /> {showDetailDialog.phone}
                  </div>
                )}
                {showDetailDialog.instagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="h-4 w-4 text-pink-500" />
                    <a href={`https://instagram.com/${showDetailDialog.instagram}`} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">@{showDetailDialog.instagram}</a>
                  </div>
                )}
                {showDetailDialog.city && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" /> {showDetailDialog.city}, {showDetailDialog.country}
                  </div>
                )}
                {showDetailDialog.employee_count && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" /> {showDetailDialog.employee_count} служители
                  </div>
                )}
                {showDetailDialog.contact_person && (
                  <div className="col-span-2 flex items-center gap-2">
                    Контакт: <strong>{showDetailDialog.contact_person}</strong>
                    {showDetailDialog.contact_role && ` (${showDetailDialog.contact_role})`}
                  </div>
                )}
              </div>
              {showDetailDialog.tags && showDetailDialog.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {showDetailDialog.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              )}
              <div className="text-xs text-muted-foreground pt-2 border-t">
                Източник: {showDetailDialog.source || "неизвестен"} |
                Добавена: {new Date(showDetailDialog.created_at).toLocaleDateString("bg-BG")}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактирай фирма</DialogTitle>
          </DialogHeader>
          {editingEntry && (
            <div className="space-y-3">
              <div>
                <Label>Име</Label>
                <Input value={editingEntry.company_name} onChange={e => setEditingEntry({ ...editingEntry, company_name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Уебсайт</Label>
                  <Input value={editingEntry.website || ""} onChange={e => setEditingEntry({ ...editingEntry, website: e.target.value })} />
                </div>
                <div>
                  <Label>Имейл</Label>
                  <Input value={editingEntry.email || ""} onChange={e => setEditingEntry({ ...editingEntry, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Телефон</Label>
                  <Input value={editingEntry.phone || ""} onChange={e => setEditingEntry({ ...editingEntry, phone: e.target.value })} />
                </div>
                <div>
                  <Label>Instagram</Label>
                  <Input value={editingEntry.instagram || ""} onChange={e => setEditingEntry({ ...editingEntry, instagram: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Град</Label>
                  <Input value={editingEntry.city || ""} onChange={e => setEditingEntry({ ...editingEntry, city: e.target.value })} />
                </div>
                <div>
                  <Label>Контакт</Label>
                  <Input value={editingEntry.contact_person || ""} onChange={e => setEditingEntry({ ...editingEntry, contact_person: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Описание</Label>
                <Textarea value={editingEntry.description || ""} onChange={e => setEditingEntry({ ...editingEntry, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>Отказ</Button>
            <Button onClick={handleSaveEdit}>Запази</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
