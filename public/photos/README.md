# Фотографии

Положите фото в нужную папку, имя файла = id из data/*.json, формат .jpg.
Если файла нет, в приложении показывается красивая заглушка. Код менять не нужно.

- `courses/<id>.jpg`: обложка курса, например `courses/doctor-cosmetology.jpg` (лучше 1200x750, горизонтальное)
- `products/<id>.jpg`: фото товара, например `products/profhilo.jpg` (лучше квадрат 1000x1000)
- `teachers/<id>.jpg`: портрет преподавателя, например `teachers/trofimovich.jpg` (квадрат 600x600, лицо по центру)

Id курсов: см. `data/courses.json`, товаров: `data/products.json`, преподавателей: поле `id` в `teachers`.
Вес одного фото не больше 300 КБ (сожмите в squoosh.app или попросите Claude Code).
