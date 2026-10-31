with open('frontend/src/pages/SourcesUpload.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Replace camera card placeholder roundness from rounded-[12px] to rounded-[4px]
text = text.replace(
    'className="relative h-full w-full rounded-[12px] overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_#e6e3dc] cursor-pointer group flex flex-col justify-between p-2.5 transition"',
    'className="relative h-full w-full rounded-[4px] overflow-hidden bg-neutral-950 shadow-[0_0_0_1px_#e6e3dc] cursor-pointer group flex flex-col justify-between p-2.5 transition"'
)

with open('frontend/src/pages/SourcesUpload.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated camera placeholder roundness to sleek rounded-[4px]!")

