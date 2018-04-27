SOURCEROOT=..
CXXFLAGS=-std=c++11 -ggdb -O0 
CXXLIBS=-Wl,-Bstatic -lcpp_redis -Wl,-Bdynamic -ltacopie -lboost_system -lboost_locale -lcrypto -lssl -lcpprest -lg3logger -lpthread

all : box easyloggingpp.conf


main.o : $(SOURCEROOT)/main.cpp
	g++ -c $^ $(CXXFLAGS) -o $@


logging.o : $(SOURCEROOT)/g3log_wrapper.cpp
	g++ -c $^ $(CXXFLAGS) -o $@


easyloggingpp.conf : $(SOURCEROOT)/easyloggingpp.conf
	cp -f $< $@


box : logging.o main.o
	g++ $^ $(CXXLIBS) -o $@

clean:
	rm -fr logs/
	rm -f *.o
	rm -f box
