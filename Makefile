EXT := vimlike.safariextz
EXTDIR := vimlike.safariextension
EXTFILES := $(EXTDIR)/Info.plist $(EXTDIR)/Settings.plist $(EXTDIR)/update.plist $(EXTDIR)/vimlike.html $(EXTDIR)/vimlike.js

.PHONY: clean

$(EXT): $(EXTFILES)
	xar -cvzf $(EXT) --distribution $(EXTDIR)

clean:
	rm -f $(EXT)
