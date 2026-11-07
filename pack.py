#!/usr/bin/env python3
"""打包清昼的两个 zip。

    python pack.py

产物：
    dist/qingzhou-<版本>.zip         安装用，含 使用说明.txt
    dist/qingzhou-<版本>-source.zip  源码，含 README / LICENSE

版本号取自 qingzhou/manifest.json，不需要手动同步。
只依赖标准库。
"""

import os
import re
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(ROOT, 'qingzhou')
DIST = os.path.join(ROOT, 'dist')
GUIDE = os.path.join(ROOT, '使用说明.txt')

# 不打包的目录 / 文件
SKIP_DIRS = {'__pycache__', 'node_modules', '.git'}
SKIP_FILES = {'.DS_Store', 'Thumbs.db', 'desktop.ini'}

# 安装包不需要的东西：设计文档与图标生成脚本
INSTALL_SKIP = {'README.md', os.path.join('tools', 'make_icons.py')}


def read_version():
    with open(os.path.join(SRC, 'manifest.json'), encoding='utf-8') as f:
        found = re.search(r'"version"\s*:\s*"([^"]+)"', f.read())
    if not found:
        raise SystemExit('manifest.json 里没有 version')
    return found.group(1)


def extension_files(skip=()):
    """遍历扩展目录，返回 (硬盘路径, zip 内路径) 列表。"""
    out = []
    for base, dirs, files in os.walk(SRC):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for name in sorted(files):
            if name in SKIP_FILES:
                continue
            full = os.path.join(base, name)
            rel = os.path.relpath(full, SRC)
            if rel in skip:
                continue
            out.append((full, 'qingzhou/' + rel.replace(os.sep, '/')))
    return out


def build(name, skip, with_docs):
    path = os.path.join(DIST, name)
    entries = extension_files(skip)
    count = len(entries)

    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for full, arc in entries:
            z.write(full, arc)
        z.write(GUIDE, 'qingzhou/使用说明.txt')
        count += 1
        if with_docs:  # 源码包额外带上仓库文档
            for extra in ('README.md', 'LICENSE'):
                z.write(os.path.join(ROOT, extra), extra)
                count += 1

    print(f'{name}  {count} 个文件  {os.path.getsize(path) / 1024:.1f} KB')


def main():
    version = read_version()
    os.makedirs(DIST, exist_ok=True)
    build(f'qingzhou-{version}.zip', INSTALL_SKIP, False)
    build(f'qingzhou-{version}-source.zip', set(), True)


if __name__ == '__main__':
    main()
