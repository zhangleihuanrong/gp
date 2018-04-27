#ifndef _HUANRONG_CONCURRENT_LIST_HPP
#define _HUANRONG_CONCURRENT_LIST_HPP

namespace huanrong {

template<
  class T,
  class Allocator = std::allocator<T>
> class ConcurrentList {
public:
  std::list<T, Allocator> list_;
  std::mutex mutex_;

  ConcurrentList() = default;

  size_t size() 
  {
    std::lock_guard<std::mutex> lock(mutex_);
    return list_.size();
  }
  
  bool pop_front(T& e)
  {
    std::lock_guard<std::mutex> lock(mutex_);
    size_t n = list_.size();
    if (n > 0) {
      e = std::move(list_.front());
      list_.pop_front();
    }
    return n > 0;
  }

  void push_back(T&& e)
  {
    std::lock_guard<std::mutex> lock(mutex_);
    list_.push_back(std::move(e));
  }

};

}

#endif
