# Supabase şema kaynağı

Bu klasör yeni migration kabul etmez. Üç eşdeğer tarihsel kopya TEMIZLIK-01 ile kaldırıldı.

Kalan `20260828190000_admin_membership_and_import.sql`, kökteki aynı adlı migration ile birebir eşdeğer değildir; yalnız fark incelemesi için korunur. Bağımsız kurulum veya migration uygulama kaynağı olarak kullanılmaz. Farkın sahibi üst çalışma alanındaki TEMEL-01 kartıdır.

Tek şema kaynağı üst çalışma alanındaki [`icmal-veri/supabase/migrations`](../../supabase/migrations) klasörüdür. Yönetim merkezi migration'ı da yalnız oraya eklenmiştir. Yerel geliştirme, CI ve üretim şema işlemleri üst çalışma alanından çalıştırılmalıdır.
