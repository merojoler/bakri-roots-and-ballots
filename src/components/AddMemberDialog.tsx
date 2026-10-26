import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { UserPlus, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitMember } from "@/lib/family.functions";
import { fileToCompressedDataUrl } from "@/lib/image";

export function AddMemberDialog() {
  const submit = useServerFn(submitMember);
  const [open, setOpen] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await submit({
        data: {
          full_name: String(f.get("full_name") || ""),
          father_name: String(f.get("father_name") || "") || null,
          relation: String(f.get("relation") || "") || null,
          phone: String(f.get("phone") || "") || null,
          notes: String(f.get("notes") || "") || null,
          photo_url: photo,
        },
      });
      setDone(true);
      setPhoto(null);
    } catch {
      setError("تعذر الإرسال، تأكد من إدخال الاسم الرباعي واسم الأب وحاول مجدداً.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setDone(false); }}>
      <DialogTrigger asChild>
        <Button variant="gold" size="lg" className="rounded-full h-12 px-6 text-base">
          <UserPlus /> أضف فرداً جديداً للعائلة
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto text-right">
        <DialogHeader className="text-right sm:text-right">
          <DialogTitle className="font-display text-2xl">إضافة فرد للعائلة</DialogTitle>
          <DialogDescription>ستتم مراجعة البيانات من الإدارة قبل ظهورها في الشجرة.</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="mx-auto size-14 text-success" />
            <p className="font-bold text-lg">تم استلام الطلب بنجاح</p>
            <p className="text-muted-foreground text-sm">سيظهر الاسم في الشجرة بعد موافقة الإدارة.</p>
            <Button variant="outline" onClick={() => setDone(false)}>إضافة فرد آخر</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="الاسم الرباعي الكامل *"><Input name="full_name" required minLength={5} pattern="\S+(\s+\S+){2,}" title="اكتب الاسم الرباعي، مثال: أمير رائد محمد البكري" placeholder="مثال: أمير رائد محمد البكري" /></Field>
            <Field label="اسم الأب الكامل *"><Input name="father_name" required minLength={5} placeholder="مثال: رائد محمد البكري" /><p className="text-xs text-muted-foreground">يُربط الاسم تلقائياً تحت الأب إذا كان مسجلاً بنفس الاسم.</p></Field>
            <Field label="صلة القرابة"><Input name="relation" placeholder="مثال: ابن، حفيد، زوجة..." /></Field>
            <Field label="الصورة الشخصية">
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) setPhoto(await fileToCompressedDataUrl(file));
                }}
              />
              {photo && <img src={photo} alt="معاينة" className="mt-2 size-20 rounded-full object-cover ring-2 ring-gold" />}
            </Field>
            <Field label="رقم الهاتف (اختياري)"><Input name="phone" type="tel" dir="ltr" className="text-right" /></Field>
            <Field label="ملاحظات"><Textarea name="notes" rows={3} /></Field>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>{busy ? "جارٍ الإرسال..." : "إرسال للمراجعة"}</Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
