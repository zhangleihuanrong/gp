#include <thread>

#include <cpprest/http_client.h>
#include <cpprest/filestream.h>
#include <cpp_redis/cpp_redis>
#include <boost/locale.hpp>

#include <deque>

#include "logging.h"
#include "StringKeyValue.hpp"
#include "semaphore.hpp"
#include "concurrentList.hpp"
#include "redisKvWriter.hpp"

using namespace utility;                    // Common utilities like string conversions
using namespace web;                        // Common features like URIs.
using namespace web::http;                  // Common HTTP functionality
using namespace web::http::client;          // HTTP client features
using namespace concurrency::streams;       // Asynchronous streams

using huanrong::semaphore;

typedef std::shared_ptr<std::string> SharedString;

static huanrong::ConcurrentList<StringKeyValue> sDailyHistoryResultList;
static semaphore sDailyHistoryResultCount(0);

static bool sCouldStop = false;
static huanrong::ConcurrentList<std::string> sWaitingHistoryStockIds;
static semaphore sHistoryTaskFullCount(16);


// stockList is , sperated stock code (prefixed with sh or sz)
// for example: sh601006,sz000001
pplx::task<SharedString> sinaListNamesEtc(const std::string& stockList) 
{
  //http://hq.sinajs.cn/list=sh601006 
  http_client* client = new http_client(uri("http://hq.sinajs.cn"));
  uri_builder builder(uri("/"));
  builder.append_query("list",  stockList);

  auto url = client->base_uri().to_string() + builder.to_string();
  LOG(TRACE) << "Creating task for url:" << url;

  return client->request(methods::GET, builder.to_string())
    .then([url, client](http_response response) -> pplx::task<SharedString> {
          std::string encoding("UTF-8");
          for (const auto& header: response.headers()) {
            LOG(TRACE)<< header.first << " ==> " << header.second;
            if (header.first == std::string("Content-Type")) {
              const char* charset = std::strstr(header.second.c_str(), "charset=");
              if (charset != nullptr) {
                encoding = charset + 8;
                LOG(TRACE) << "++++Using encoding " << encoding << " for " << url;
              }
            }
          }
          std::transform(encoding.cbegin(), encoding.cend(), encoding.begin(), ::tolower);

          if (response.status_code() != 200) {
            LOG(ERROR) << "http response status code: " << response.status_code() << " for " << url;
            delete client;
            SharedString sp(new std::string(""));
            return pplx::task_from_result(sp);
          }

          LOG(TRACE) << "http response status code: " << response.status_code() << " for " << url;
          return response.extract_string(true)
              .then([client, encoding](std::string content) -> pplx::task<SharedString> {
                delete client;
                if (strcmp(encoding.c_str(), "utf8") == 0 || strcmp(encoding.c_str(), "utf-8") == 0) {
                    SharedString sp(new std::string(std::move(content)));
                    return pplx::task_from_result(sp);
                }
                std::string utf8Value = boost::locale::conv::to_utf<char>(content, encoding);
                SharedString sp(new std::string(std::move(utf8Value)));
                return pplx::task_from_result(sp);
            });
    });
}


std::string transformStockId4Sohu(const std::string& chsStockId) {
  static const std::string cnprefix("cn_");

  if (chsStockId.substr(0, 2) == "sh") {
    return cnprefix + chsStockId.substr(2);
  }
  if (chsStockId.substr(0, 2) == "sz") {
    return cnprefix + chsStockId.substr(2);
  }
  return cnprefix + std::string(chsStockId);
}


pplx::task<void>
sohuStockDailyHistory(const std::string& chsStockId, 
                      const std::string& startDay,
                      const std::string& endDay)
{
  //http://q.stock.sohu.com/hisHq?code=cn_002142&start=20141001&end=20141231&stat=1&order=D&period=d&callback=hrySearchHandler&rt=jsonp
  http_client* client = new http_client(uri("http://q.stock.sohu.com"));
  uri_builder builder(uri("/hisHq"));
  std::string stockId = transformStockId4Sohu(chsStockId);
  builder.append_query("code",  stockId);
  builder.append_query("start", startDay.c_str());
  builder.append_query("end", endDay.c_str());
  builder.append_query("stat", "1");
  builder.append_query("order", "D");
  builder.append_query("callback", "historySearchHandler");
  builder.append_query("rt", "jsonp");
    
  auto url = client->base_uri().to_string() + builder.to_string();
  LOG(TRACE) << "Creating task for url:" << url;
  return client->request(methods::GET, builder.to_string())
    .then([client, url, chsStockId](http_response response)->pplx::task<bool> {
       if (response.status_code() != 200) {
         LOG(WARNING) << "http response status code: " << response.status_code() << " for " << url;
         delete client;
         return pplx::task_from_result(false);
       }

       LOG(TRACE) << "http response status code: " << response.status_code() << " for " << url;
       for (auto& header: response.headers()) {
          LOG(TRACE)<< header.first << " ==> " << header.second;
       }

       unsigned char arr[4096];
       std::shared_ptr<std::deque<unsigned char>> bufptr(new std::deque<unsigned char>);
       try {
           while (true) {
             auto sz = response.body().streambuf().getn(arr, sizeof(arr)).get();
             LOG(TRACE) << "Read " << sz << " bytes for " + url;
             if (sz == 0) break;
             for (size_t i = 0; i < sz; ++i) bufptr->push_back(arr[i]);
           }
       }
       catch (std::exception& ex) {
         LOG(ERROR) << "Error reading from response stream: " << ex.what();
         delete client;
         return pplx::task_from_result(false);
       }

       delete client;
       sDailyHistoryResultList.push_back(
          StringKeyValue(std::string(chsStockId), std::string(bufptr->begin(), bufptr->end()))
       );
       sDailyHistoryResultCount.notify_one();
       
       return pplx::task_from_result(true);
    })
    .then([chsStockId](pplx::task<bool> historyTask) {
      bool success = false;
      try {
        success = historyTask.get();
      }
      catch (std::exception& ex) {
         LOG(ERROR) << "EXCEPTION: " << ex.what();
      } 
      sHistoryTaskFullCount.notify_all();
      
      if (!success) {
         LOG(WARNING) << "Put back for history: " << chsStockId;
         sWaitingHistoryStockIds.push_back(std::string(chsStockId));
      }
    });
}


pplx::task<std::string>
sinaStockListPages(int p) 
{
  http_client* client = new http_client(uri("http://vip.stock.finance.sina.com.cn"));
  uri_builder builder(uri("q/go.php/vIR_CustomSearch/index.phtml"));
  builder.append_query("p", std::to_string(p).c_str());
  builder.append_query("sr_p", "-1");

  auto url = client->base_uri().to_string() + builder.to_string();
  LOG(TRACE) << "Creating task for url:" << url;

  pplx::task<std::string> extractTask = client->request(methods::GET, builder.to_string())
  .then([url](http_response response)->pplx::task<std::string> {
      LOG(TRACE) << "http response status code: " << response.status_code() << " for " << url;
      if (response.status_code() != 200) {
        return pplx::task_from_result(std::string(""));
      }
      return response.extract_string(true);
   })
  .then([client](std::string content)->pplx::task<std::string> {
      delete client;
      auto start = std::strstr((const char*)&(content[0]), "var code_list");
      if (start != nullptr) {
        start += std::strlen("var code_list");
        auto next = std::strstr(start, "var element_list");
        if (next != nullptr) {
          std::string code_list(start, next - start);
          auto rs = std::strstr(code_list.c_str(), "\"");
          if (rs != nullptr && *(rs + 1) != '"') {
            auto rt = std::strstr(rs + 1, "\";");
            if (rt != nullptr) {
              std::string real_code_list(rs + 1, rt);
              LOG(TRACE) << real_code_list;
              return pplx::task_from_result(real_code_list);
            }
          }
        }
      }
      return pplx::task_from_result(std::string(""));
  });

  return extractTask;
}


void addAllCodeNamesRedis(const std::map<std::string, std::string>& id2names)
{
  LOG(INFO) << "Adding total " << id2names.size() << " names into redis...";

  cpp_redis::redis_client client;
  client.connect("127.0.0.1", 6379);

  for (auto it = begin(id2names); it !=  end(id2names); ++it) {
    const std::string key(it->first);
    const std::string value(it->second);
    if (key.size() > 0 && value.size() > 0) {
      client.hset("_stockId2Name", key, value, [key, value](cpp_redis::reply& reply) {
          LOG(INFO) << "Reply for adding names " << value << " for " << key << " to _stockId2Name using hset is:" << reply;
        });
      client.sync_commit();
    }
  }
  client.disconnect();

  LOG(INFO) << "==Finished adding names into redis...";
}


void addAllCodeToRedis(const std::vector<std::string>& all_codes)
{
  LOG(INFO) << "Adding " << all_codes.size() << " names into redis...";

  cpp_redis::redis_client client;

  client.connect();
  client.sadd("_stockCodes", all_codes, [](cpp_redis::reply& reply) {
      LOG(TRACE) << "Reply for adding all codes to _stockCodes using sadd :" << reply;
      });
  client.sync_commit();
  client.disconnect();

  LOG(INFO) << "==Finished adding stock names into redis...";
}


std::string getCurrentTimeString(const char* fmt)
{
  time_t rawtime;
  struct tm * timeinfo;
  char buffer[80];

  time (&rawtime);
  timeinfo = localtime(&rawtime);
  

  strftime(buffer,sizeof(buffer), fmt,timeinfo);
  return std::string(buffer);
}

// The first page is 1
void getAllStockSina(int startPage, int lastPage) 
{
  LOG(INFO) << "Collecting stock codes...";
  std::vector<pplx::task<std::string>> extractTasks;
  extractTasks.reserve(100);

  std::vector<std::string> all_codes;
  all_codes.reserve(3000);

  for (int i = startPage; i < lastPage; ++i) {
    extractTasks.push_back(sinaStockListPages(i));
  }

  LOG(INFO) << "--Waiting stock codes list of all pages...";
  for (size_t i = 0; i < extractTasks.size(); ++i) {
    auto cl = extractTasks[i].get();
    LOG(INFO) << "----chunk of codes from page:" << i << "----" << cl;
    std::vector<std::string> codes;
    boost::split(codes, cl, boost::is_any_of(","));
    for (const std::string& c : codes) {
      if (c[0] == 's') {
        all_codes.push_back(c);
      }
    }
  }
  LOG(INFO) << "==Get " << all_codes.size() << " stock codes.";
  addAllCodeToRedis(all_codes);

  const size_t kChunkSize = 20;
  std::map<std::string, std::string> stockId2Names;
  for (size_t s = 0; s < all_codes.size(); s += kChunkSize) {
    size_t e = std::min(all_codes.size(), s + kChunkSize);
    LOG(INFO) << "Create tasks to get names etc for stock ranges[" << s << "," << e << ")...";

    std::vector<pplx::task<SharedString>> infoTasks;
    for (size_t i = s; i < e; ++i) {
      infoTasks.push_back(sinaListNamesEtc(all_codes[i]));
      LOG(TRACE) << "Created task to get names etc for " << all_codes[i];
    }
    LOG(INFO) << "Waiting stock daily history results for [" << s << "," << e << ")...";
    for (size_t i = 0; i < infoTasks.size(); ++i) {
      auto v = infoTasks[i].get();
      //var hq_str_sh600057="象屿股份,10.710,10.690,10.730,10.760,10.610,10.720,10.730,2962516,31683176.000,1140....
      const char* hq_str_ = std::strstr(v->c_str(), "hq_str_");
      const char* first_equalquote = std::strstr(v->c_str(), "=\"");
      const char* first_comma = std::strstr(v->c_str(), ",");
      if (hq_str_ != nullptr && hq_str_ < first_equalquote && first_equalquote < first_comma) {
        std::string id(hq_str_ + strlen("hq_str_"), first_equalquote);
        std::string name(first_equalquote + 2, first_comma);
        stockId2Names[id] = name;
        LOG(INFO) << "====id2name====" << id << ":" << name;
      }
    }
    LOG(INFO) << "==Finished stock daily history results for [" << s << "," << e << ")";
  }
  addAllCodeNamesRedis(stockId2Names);


  LOG(INFO) << "Starting thread to inject stock history into redis from queue...";
  RedisKeyValueWriter redisKvWriter(
                     std::string("DailyHistoryInjector"), 
                     sDailyHistoryResultList, 
                     sDailyHistoryResultCount,
                     [](){return sCouldStop;} );

  redisKvWriter.start(); 

  std::string startDayInString("20130806");
  std::string todayInString = getCurrentTimeString("%Y%m%d");  

  for (size_t s = 0; s < all_codes.size(); s++) {
    sWaitingHistoryStockIds.list_.push_back(all_codes[s]);
  }
  LOG(INFO) << "Total " << sWaitingHistoryStockIds.size() << " stockIds to fetch history...";

  while (true) {
    auto waiting = sWaitingHistoryStockIds.size();
    auto remaining = -1L * sHistoryTaskFullCount.diff();
    if (waiting == 0 && remaining == 0) break;

    if (waiting == 0) {
      LOG(INFO) << "Empty waiting list, waiting " << remaining << " tasks to finish";
      std::this_thread::sleep_for(std::chrono::milliseconds(100));
      continue;
    }

    if (!sHistoryTaskFullCount.wait_for(std::chrono::milliseconds(100))) {
      LOG(INFO) << "No free task slot, continue waiting...";
      continue;
    }

    std::string stockId;
    sWaitingHistoryStockIds.pop_front(stockId);
    sohuStockDailyHistory(stockId, startDayInString, todayInString);
    LOG(INFO) << "Created task to get stock daily history for " << stockId;
  }

  sCouldStop = true;
  redisKvWriter.join();

  LOG(INFO) << "Done!Done!Done!";
}


int main(int argc, char* argv[])
{
  initLogging(nullptr);

  LOG(TRACE) << "Log level: TRACE";
  LOG(DEBUG) << "Log level: DEBUG";
  LOG(INFO) << "Log level: INFO";
  LOG(WARNING) << "Log level: WARNING";
  LOG(ERROR) << "Log level: ERROR";

  //auto now = g3::systemtime_now();
  //auto ct = g3::localtime_formatted(now, "%a %b %d %H:%M:%S %Y");

  //sinaList(std::string("sh601006,sz000001"));
  int startPage = 1;
  int lastPage = 90;
  if (argc > 2) {
    startPage = std::atoi(argv[1]);
    lastPage = std::atoi(argv[2]);
  }

  getAllStockSina(startPage, lastPage);


  std::this_thread::sleep_for(std::chrono::seconds(1));

  return 0;
}

