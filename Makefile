# SecureQA Makefile — short aliases for the run.py CLI.
# TR: run.py komutları için kısayollar. Örnek:  make test
#
# The venv must be active, or set PY to its python:  make PY=.venv/bin/python test

PY ?= python

.PHONY: help install app test functional security juiceshop report compare all clean

help:  ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

install:  ## install Python dependencies
	$(PY) -m pip install -r requirements.txt

app:  ## start SecureShop (the secure demo app)
	$(PY) run.py app

test:  ## run SecureShop functional + defensive security checks (should pass)
	$(PY) run.py test

functional:  ## run only the functional tests
	$(PY) -m pytest -m functional

security:  ## run only the SecureShop defensive security checks
	$(PY) -m pytest -m security

juiceshop:  ## attack Juice Shop (needs JUICE_SHOP_URL=http://127.0.0.1:3000)
	$(PY) run.py juiceshop

report:  ## show where the HTML report is
	$(PY) run.py report

compare:  ## build the SecureShop-vs-Juice-Shop comparison page
	$(PY) run.py compare

all:  ## run everything and build the comparison
	$(PY) run.py all

clean:  ## remove generated reports and caches
	rm -f reports/*.html reports/*.json reports/*.log
	find . -type d -name __pycache__ -prune -exec rm -rf {} +
	rm -rf .pytest_cache
